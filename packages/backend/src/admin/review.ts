// Nightly editor queue. Reading the queue prepares only pending proposals; it never grants public
// visibility. Every command still compares the displayed fingerprint/version inside its transaction.
import { sql } from "../db.ts";
import { getReviewProposal, proposeReview } from "../editorial/review.ts";
import { config } from "../config.ts";
import { automaticContentOverview } from "./automatic-content.ts";
import type { AutomaticContentOverview } from "@aihot/contracts/automatic-content";

type Candidate = {
  id: string; source: string; source_id: string; url: string; original_title: string;
  body_text: string | null; excerpt: string | null; title_zh: string;
  summary_zh: string; reason_zh: string | null; category: string | null; score: number | null;
  revision: number; discovered_at: Date; processing_state: string; grouped_at: Date | null;
  fact_title: string | null; translation: string | null; review_version: number | null;
  review_fingerprint: string | null; prior_review: boolean; override_version: number | null;
};

const RISK: Array<[RegExp, string]> = [
  [/\b(exploit|hacked?|breach|vulnerability|cve-\d+|attack|stolen|drain(?:ed|ing)?)\b|漏洞|攻击|被盗|安全事件/i, "安全事件或漏洞"],
  [/\b(sec|cftc|regulat(?:ion|or|ory)|lawsuit|sanction|enforcement|court)\b|监管|起诉|制裁|法院/i, "监管或法律信息"],
  [/\b(yield|apy|apr|profit|return|airdrop|token sale|fundrais(?:e|ing)|loss)\b|收益|年化|融资|空投|亏损|资金/i, "资金、收益或推广声明"],
  [/\b(disput(?:ed|e)|rumou?r|unconfirmed|alleg(?:ed|ation))\b|争议|传闻|未经证实/i, "尚有争议的信息"],
];

function reasons(row: Candidate) {
  const haystack = [row.original_title, row.body_text, row.title_zh, row.summary_zh].join(" ");
  const flags = RISK.filter(([pattern]) => pattern.test(haystack)).map(([, label]) => label);
  if (row.prior_review) flags.unshift("曾公开内容有新版本，需复审");
  return flags.length ? flags : ["普通待审核内容"];
}

export async function listReviewQueue(limit = 40, sourceId?: string, view?: string) {
  const bounded = Math.min(100, Math.max(1, Number.isFinite(limit) ? Math.floor(limit) : 40));
  if (config.editorialMode === "automatic" && view !== "intervention") {
    const automation=await automaticContentOverview(bounded,sourceId,view);
    return {mode:"automatic" as const,manualIntervention:false,pendingCount:0,failureCount:automation.counts.failed,budgetWaitCount:automation.counts.budgetWait,
      rows:[],failures:[],budgetWaits:[],automation};
  }
  // Budget exhaustion is an automatic wait, not a terminal content/provider failure.
  const budgetWait = sql`processing_state = 'new' AND coalesce(processing_error ~ '^Budget for [a-zA-Z0-9_-]+ exhausted [(](minute|hour|day|stopped)[)]$', false)`;
  const [counts] = await sql<{ pending: number; failures: number; budget_waits: number }[]>`
    SELECT (SELECT count(*)::int FROM articles a
      JOIN LATERAL (SELECT relevance, title_zh, summary_zh FROM analyses
        WHERE article_id = a.id AND input_revision = a.revision ORDER BY id DESC LIMIT 1) an ON true
      LEFT JOIN editorial_reviews r ON r.article_id = a.id
      WHERE a.processing_state = 'analyzed' AND an.relevance = 'pass'
        AND EXISTS (SELECT 1 FROM sources s WHERE s.id = a.source_id AND s.enabled AND s.participation_mode = 'editorial')
        AND (${sourceId ?? null}::text IS NULL OR a.source_id = ${sourceId ?? null})
        AND an.title_zh IS NOT NULL AND an.summary_zh IS NOT NULL
        AND (r.article_id IS NULL OR r.status = 'pending')) AS pending,
      (SELECT count(*)::int FROM articles WHERE (processing_state = 'failed' OR processing_error IS NOT NULL)
        AND NOT (${budgetWait})
        AND (${sourceId ?? null}::text IS NULL OR source_id = ${sourceId ?? null})) AS failures,
      (SELECT count(*)::int FROM articles WHERE ${budgetWait}
        AND (${sourceId ?? null}::text IS NULL OR source_id = ${sourceId ?? null})) AS budget_waits`;
  const candidates = await sql<{ id: string }[]>`
    SELECT a.id
    FROM articles a JOIN sources s ON s.id = a.source_id
    JOIN LATERAL (SELECT * FROM analyses WHERE article_id = a.id AND input_revision = a.revision
      ORDER BY id DESC LIMIT 1) an ON true
    LEFT JOIN editorial_reviews r ON r.article_id = a.id
    WHERE a.processing_state = 'analyzed' AND an.relevance = 'pass' AND s.enabled AND s.participation_mode = 'editorial'
      AND (${sourceId ?? null}::text IS NULL OR a.source_id = ${sourceId ?? null})
      AND an.title_zh IS NOT NULL AND an.summary_zh IS NOT NULL
      AND (r.article_id IS NULL OR r.status = 'pending')
    ORDER BY (r.version > 1) DESC NULLS LAST,
      (a.title || ' ' || coalesce(a.body_text, '') || ' ' || an.summary_zh) ~* '(exploit|hack|cve-|stolen|yield|apy|apr|regulat|sec|监管|安全|被盗|资金|收益|漏洞)' DESC,
      a.discovered_at DESC LIMIT ${Math.max(bounded * 3, 100)}`;
  const rows = [];
  for (const { id } of candidates) {
    // Prepare the exact proposal for a new or changed item. This can only create a pending row.
    if (!await proposeReview(id)) continue;
    // Display and fingerprint must come from the same snapshot. Otherwise an edit between the list
    // read and proposal refresh could pair old visible copy with a new approvable fingerprint.
    const snapshot = await sql.begin(async (tx) => {
      await tx`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`;
      const [candidate] = await tx<Candidate[]>`
        SELECT a.id, s.name AS source, s.id AS source_id, a.url, a.title AS original_title,
          coalesce(a.body_text, a.x_post->>'text') AS body_text, a.excerpt,
          coalesce(o.fields->>'title', an.title_zh) AS title_zh,
          coalesce(o.fields->>'summary', an.summary_zh) AS summary_zh, an.reason_zh,
          coalesce(o.fields->>'category', an.category) AS category,
          an.score, a.revision, a.discovered_at, a.processing_state, a.grouped_at,
          (SELECT f.title FROM fact_articles fa JOIN facts f ON f.id = fa.fact_id
            WHERE fa.article_id = a.id ORDER BY fa.created_at DESC LIMIT 1) AS fact_title,
          tr.body_text AS translation,
          (r.version > 1 OR EXISTS (SELECT 1 FROM audit_log l WHERE l.subject = 'content:' || a.id AND l.action = 'content.review')) AS prior_review,
          o.version AS override_version
        FROM articles a JOIN sources s ON s.id = a.source_id
        JOIN LATERAL (SELECT * FROM analyses WHERE article_id = a.id AND input_revision = a.revision ORDER BY id DESC LIMIT 1) an ON true
        LEFT JOIN editorial_reviews r ON r.article_id = a.id
        LEFT JOIN editorial_overrides o ON o.article_id = a.id
        LEFT JOIN translations tr ON tr.article_id = a.id AND tr.lang = 'zh' AND tr.revision >= a.revision
        WHERE a.id = ${id} AND a.processing_state = 'analyzed' AND an.relevance = 'pass'
          AND s.enabled AND s.participation_mode = 'editorial'
          AND an.title_zh IS NOT NULL AND an.summary_zh IS NOT NULL`;
      const proposal = candidate ? await getReviewProposal(id, tx) : null;
      const [review] = candidate ? await tx<{ status: string; version: number; fingerprint: string }[]>`
        SELECT status, version, fingerprint FROM editorial_reviews WHERE article_id = ${id}` : [];
      return candidate && proposal && review?.status === "pending" && review.fingerprint === proposal.fingerprint
        ? { candidate, proposal, review } : null;
    });
    if (!snapshot) continue;
    const { candidate, proposal, review } = snapshot;
    const flags = reasons(candidate);
    rows.push({
      id: candidate.id, source: candidate.source, sourceId: candidate.source_id,
      original: { title: candidate.original_title, url: candidate.url, body: candidate.body_text ?? candidate.excerpt ?? "" },
      chinese: { title: candidate.title_zh, summary: candidate.summary_zh, translation: candidate.translation },
      category: candidate.category, score: candidate.score, grouping: candidate.fact_title,
      revision: candidate.revision, discoveredAt: candidate.discovered_at,
      fingerprint: proposal.fingerprint, version: review.version, overrideVersion: candidate.override_version ?? 0,
      riskReason: flags.join("；"), priority: flags[0] === "普通待审核内容" ? 0 : candidate.prior_review ? 2 : 1,
    });
  }
  rows.sort((a, b) => b.priority - a.priority || new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime());
  const failures = await sql<{ id: string; title: string; source: string; error: string | null; discovered_at: Date }[]>`
    SELECT a.id, a.title, s.name AS source, a.processing_error AS error, a.discovered_at
    FROM articles a JOIN sources s ON s.id = a.source_id
    WHERE (a.processing_state = 'failed' OR a.processing_error IS NOT NULL)
      AND NOT (${budgetWait})
      AND (${sourceId ?? null}::text IS NULL OR a.source_id = ${sourceId ?? null})
    ORDER BY a.discovered_at DESC LIMIT 20`;
  const budgetWaits = await sql`
    SELECT a.id, a.title, s.name AS source, a.processing_error AS error, a.processing_retry_at AS retry_at, a.discovered_at
    FROM articles a JOIN sources s ON s.id = a.source_id
    WHERE ${budgetWait} AND (${sourceId ?? null}::text IS NULL OR a.source_id = ${sourceId ?? null})
    ORDER BY a.discovered_at DESC LIMIT 20`;
  return { mode:config.editorialMode,manualIntervention:config.editorialMode==="automatic",automation:null as AutomaticContentOverview|null,pendingCount: counts?.pending ?? 0, failureCount: counts?.failures ?? 0, budgetWaitCount: counts?.budget_waits ?? 0,
    rows: rows.slice(0, bounded), failures, budgetWaits };
}
