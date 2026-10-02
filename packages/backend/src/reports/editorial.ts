// Nightly report workflow. Drafts and versions are immutable; a report identity
// becomes public only after an editor or the automatic policy accepts an exact candidate snapshot.
import { createHash } from "node:crypto";
import { beijingDate } from "@aihot/contracts/time";
import { CATEGORIES } from "@aihot/industry/taxonomy";
import { sql, type Tx } from "../db.ts";
import { curatedEvidence } from "../events/eligibility.ts";
import { currentAutomaticDecision } from "../editorial/automatic-verification.ts";
import { stableJson } from "../lib/ids.ts";
import { getReviewProposal } from "../editorial/review.ts";

const SECTION_OF: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.section]));
const SECTION_ORDER = [...new Set(CATEGORIES.map((c) => c.section))];
const DEFAULT_SECTION = SECTION_OF.industry ?? SECTION_ORDER.at(-1)!;

interface Row {
  id: string; title: string; summary: string | null; url: string; category: string | null;
  score: number | null; source_id: string; source_name: string; source_kind: string;
  first_party: boolean; fact_id: number | null; story_public_id: string | null;
  at: Date; review_fingerprint: string; review_version: number; review_status: string;
}
interface CandidateStamp { articleId: string; fingerprint: string; reviewVersion: number }
interface CandidateState { rows: Row[]; stamps: CandidateStamp[]; hash: string }

export class StaleReportDraft extends Error {
  code = "conflict";
  constructor(message = "日报草稿或候选内容已变化，请重新生成草稿") { super(message); }
}

const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

async function candidateState(tx: Tx, start: Date, cutoff: Date, automatic = false): Promise<CandidateState> {
  const rows = await tx<Row[]>`
    SELECT p.article_id AS id,p.title,p.summary,p.url,p.category,p.score,
      s.id AS source_id,s.name AS source_name,s.kind AS source_kind,p.first_party,
      p.fact_id,st.public_id::text AS story_public_id,CASE WHEN ${automatic} THEN p.published_at ELSE p.timeline_at END AS at,
      r.fingerprint AS review_fingerprint,r.version AS review_version,r.status AS review_status
    FROM publications p JOIN sources s ON s.id=p.source_id
    JOIN articles a ON a.id=p.article_id
    JOIN editorial_reviews r ON r.article_id=p.article_id
    JOIN editorial_curations c ON c.article_id=p.article_id AND c.status='approved'
      AND c.fingerprint=r.fingerprint AND c.review_version=r.version
    LEFT JOIN stories st ON st.id=p.story_id
    WHERE ${curatedEvidence("p", cutoff, automatic)} AND p.selected
      AND (${automatic} AND r.status='auto_public' OR NOT ${automatic} AND r.status='approved')
      AND ((NOT ${automatic} AND NOT p.backfill) OR (${automatic}
        AND p.published_at IS NOT NULL AND p.discovered_at-p.published_at <= interval '48 hours'
        AND (NOT p.backfill OR a.backfill_reason='first-import')))
      AND greatest(p.timeline_at,p.visible_after) >= ${start}
      AND greatest(p.timeline_at,p.visible_after) < ${cutoff}
    ORDER BY p.article_id`;
  const cited = await tx<{ citations: Array<{ articleId: string }> }[]>`
    SELECT v.citations FROM report_versions v JOIN reports r ON r.id=v.report_id WHERE r.kind='daily'`;
  const used = new Set(cited.flatMap((v) => v.citations.map((c) => c.articleId)));
  const fresh = rows.filter((r) => !used.has(r.id));
  const valid: Row[] = [];
  for (const row of fresh) {
    const proposal = await getReviewProposal(row.id, tx);
    if (proposal?.fingerprint !== row.review_fingerprint) continue;
    if (automatic && !(await currentAutomaticDecision(tx, row.id))?.selected) continue;
    valid.push(row);
  }
  const stamps = valid.map((r) => ({ articleId: r.id, fingerprint: r.review_fingerprint, reviewVersion: r.review_version }));
  return { rows: valid, stamps, hash: hash(stamps) };
}

function roleOf(kind: string, firstParty: boolean): string {
  if (firstParty) return kind === "x_search" ? "X·官方" : "官方";
  return kind === "x_search" ? "X·KOL" : kind === "mp_account" ? "公众号" : "媒体";
}

function draftContent(rows: Row[], start: Date, cutoff: Date, automatic = false) {
  // Include every eligible article exactly once. A section cap or fact-level
  // representative would silently drop uncited articles at the next cutoff.
  const sorted = [...rows].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const perSection = new Map<string, Array<Record<string, unknown>>>();
  const flashes: Array<Record<string, unknown>> = [];
  for (const r of sorted) {
    const entry = {
      itemId: r.id, approvedFingerprint: r.review_fingerprint, title: r.title, summary: r.summary ?? "",
      sourceName: r.source_name, sourceUrl: r.url, sourceId: r.source_id, firstParty: r.first_party,
      role: roleOf(r.source_kind, r.first_party), score: r.score, publishedAt: r.at.toISOString(),
      storyPublicId: r.story_public_id,
    };
    const label = SECTION_OF[r.category ?? ""] ?? DEFAULT_SECTION;
    const list = perSection.get(label) ?? [];
    list.push(entry);
    perSection.set(label, list);
  }
  const sections = SECTION_ORDER.filter((label) => perSection.get(label)?.length).map((label) => ({ label, items: perSection.get(label)! }));
  return {
    date: beijingDate(cutoff), lead: null, highlights: [], sections, flashes,
    metrics: { totalEvents: sections.reduce((n, s) => n + s.items.length, 0),
      sourcesCount: new Set(sorted.map((r) => r.source_id)).size,
      firstPartyEvents: sorted.filter((r) => r.first_party).length },
    windowStart: start.toISOString(), windowEnd: cutoff.toISOString(),
    generator: { version: automatic ? "9btc-automatic-draft-v1" : "9btc-manual-draft-v1", model: null },
  };
}

export async function createDailyDraft(actor: string, cutoff = new Date(), options: { automatic?: boolean } = {}) {
  if (!actor.trim()) throw new Error("actor is required");
  const key = beijingDate(cutoff);
  return sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtext('report_candidates'))`;
    const [last] = await tx<{ window_end: Date }[]>`
      SELECT window_end FROM published_reports WHERE kind='daily' ORDER BY window_end DESC LIMIT 1`;
    const [launch] = await tx<{ value: { at: string } }[]>`SELECT value FROM settings WHERE key='report_launch_start'`;
    const start = last?.window_end ?? (launch?.value?.at ? new Date(launch.value.at) : cutoff);
    if (!(start < cutoff)) throw new StaleReportDraft("尚无可生成日报的时间窗口");
    const state = await candidateState(tx, start, cutoff, options.automatic);
    if (!state.rows.length) throw new StaleReportDraft("该时段尚无人工精选内容，不能生成空日报");
    const content = draftContent(state.rows, start, cutoff, options.automatic);
    const [report] = await tx<{ id: number; active_version_id: number | null }[]>`
      INSERT INTO reports (kind,key,window_start,window_end,content,generated_at,origin)
      VALUES ('daily',${key},${start},${cutoff},'{}'::jsonb,now(),${options.automatic ? 'automatic' : 'manual'})
      ON CONFLICT (kind,key) DO UPDATE SET origin=CASE WHEN reports.active_version_id IS NULL THEN excluded.origin ELSE reports.origin END RETURNING id,active_version_id`;
    if (!report) throw new Error("failed to create report identity");
    if (report.active_version_id) throw new StaleReportDraft("今天的日报已经发布，不能再次生成首版草稿");
    const [draft] = await tx<{ id: number }[]>`
      INSERT INTO report_drafts (report_id,window_start,cutoff,content,candidate_set,candidate_hash,created_by)
      VALUES (${report.id},${start},${cutoff},${tx.json(content as never)},${tx.json(state.stamps as never)},${state.hash},${actor}) RETURNING id`;
    await tx`INSERT INTO audit_log (actor,action,subject,reason,after)
      VALUES (${actor},'report.draft',${`report:daily:${key}`},${options.automatic ? '自动策略生成已核验精选日报草稿' : '人工生成日报草稿'},${tx.json({ draftId: draft!.id, candidates: state.stamps.length })})`;
    return { key, draftId: draft!.id, candidates: state.stamps.length, content };
  });
}

export async function dailyDraft(key: string) {
  const [row] = await sql<{
    report_id: number; active_version_id: number | null; draft_id: number | null; cutoff: Date | null;
    window_start: Date | null; content: Record<string, unknown> | null; candidate_hash: string | null;
  }[]>`
    SELECT r.id AS report_id,r.active_version_id,d.id AS draft_id,d.cutoff,d.window_start,d.content,d.candidate_hash
    FROM reports r LEFT JOIN LATERAL (SELECT * FROM report_drafts WHERE report_id=r.id ORDER BY id DESC LIMIT 1) d ON true
    WHERE r.kind='daily' AND r.key=${key}`;
  return row ?? null;
}

export async function publishDailyDraft(draftId: number, actor: string, reason: string, options: { automatic?: boolean } = {}) {
  if (!Number.isInteger(draftId) || draftId <= 0 || !actor.trim() || !reason.trim()) {
    throw Object.assign(new Error("需要有效草稿、审核人和发布原因"), { statusCode: 400 });
  }
  return sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtext('report_candidates'))`;
    const [draft] = await tx<{
      id: number; report_id: number; key: string; window_start: Date; cutoff: Date;
      content: Record<string, any>; candidate_set: CandidateStamp[]; candidate_hash: string;
      active_version_id: number | null;
    }[]>`
      SELECT d.*,r.key,r.active_version_id FROM report_drafts d JOIN reports r ON r.id=d.report_id
      WHERE d.id=${draftId} AND r.kind='daily' FOR UPDATE OF r`;
    if (!draft) throw new StaleReportDraft("日报草稿不存在");
    if (draft.key !== beijingDate(new Date())) throw new StaleReportDraft("已跨过北京时间日期，请重新生成当日草稿");
    const [latest] = await tx<{ id: number }[]>`SELECT id FROM report_drafts WHERE report_id=${draft.report_id} ORDER BY id DESC LIMIT 1`;
    if (latest?.id !== draft.id) throw new StaleReportDraft("这不是该期最新草稿");
    const [last] = await tx<{ window_end: Date }[]>`
      SELECT window_end FROM published_reports WHERE kind='daily' ORDER BY window_end DESC LIMIT 1`;
    const [launch] = await tx<{ value: { at: string } }[]>`SELECT value FROM settings WHERE key='report_launch_start'`;
    const start = last?.window_end ?? (launch?.value?.at ? new Date(launch.value.at) : draft.window_start);
    if (start.getTime() !== draft.window_start.getTime() || draft.active_version_id) throw new StaleReportDraft();
    const state = await candidateState(tx, start, draft.cutoff, options.automatic);
    if (!state.rows.length || state.hash !== draft.candidate_hash ||
        JSON.stringify(state.stamps) !== JSON.stringify(draft.candidate_set)) throw new StaleReportDraft();
    if (stableJson(draft.content) !== stableJson(draftContent(state.rows, start, draft.cutoff, options.automatic))) throw new StaleReportDraft();
    const citations = [...(draft.content.sections ?? []).flatMap((s: any) => s.items ?? []), ...(draft.content.flashes ?? [])]
      .map((item: any) => ({ articleId: item.itemId, fingerprint: item.approvedFingerprint }));
    // Content reading order is score-based; compare exact membership and fingerprints.
    const actual = [...citations].sort((a,b) => a.articleId.localeCompare(b.articleId));
    const expected = state.stamps.map(s => ({ articleId: s.articleId, fingerprint: s.fingerprint })).sort((a,b) => a.articleId.localeCompare(b.articleId));
    if (stableJson(actual) !== stableJson(expected)) throw new StaleReportDraft();
    if (!citations.length) throw new StaleReportDraft("空日报不能发布");
    const [version] = await tx<{ id: number; version: number }[]>`
      INSERT INTO report_versions (report_id,version,draft_id,window_start,window_end,content,candidate_hash,citations,published_by,reason)
      VALUES (${draft.report_id},1,${draft.id},${start},${draft.cutoff},${tx.json(draft.content as never)},
        ${draft.candidate_hash},${tx.json(citations as never)},${actor},${reason}) RETURNING id,version`;
    await tx`UPDATE reports SET active_version_id=${version!.id},updated_at=now() WHERE id=${draft.report_id}`;
    await tx`INSERT INTO audit_log (actor,action,subject,reason,after)
      VALUES (${actor},'report.publish',${`report:daily:${draft.key}`},${reason},
        ${tx.json({ draftId: draft.id, versionId: version!.id, candidates: state.stamps.length })})`;
    return { key: draft.key, version: version!.version, publishedAt: new Date().toISOString() };
  });
}
