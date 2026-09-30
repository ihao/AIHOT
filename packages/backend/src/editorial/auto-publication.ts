// Apply the narrow automatic all-feed grant to an already analyzed article.
// The caller holds its article row lock and publishes the resulting projection
// before commit; no source is allowlisted by migration or code defaults.
import type { Tx } from "../db.ts";
import { getReviewProposal } from "./review.ts";
import { evaluateAutoPolicy, type AutoPolicyDecision } from "./auto-policy.ts";

export interface AutoPublicationResult extends AutoPolicyDecision { granted: boolean }

export async function considerAutoPublicationTx(tx: Tx, articleId: string): Promise<AutoPublicationResult> {
  const [row] = await tx<{
    source_id: string; url: string; title: string; body_text: string | null; body_status: string;
    name: string; source_enabled: boolean; kind: string; tier: string; participation_mode: string;
    first_party: boolean; owner_entity_id: string | null; config: Record<string, unknown>;
    auto_enabled: boolean | null; policy_version: number | null; analysis_id: number;
    relevance: string; score: number | null; title_zh: string | null; summary_zh: string | null;
    output: Record<string, unknown>;
  }[]>`
    SELECT a.source_id,a.url,a.title,a.body_text,a.body_status,
      s.name,s.enabled AS source_enabled,s.kind,s.tier,s.participation_mode,s.first_party,s.owner_entity_id,s.config,
      sp.enabled AS auto_enabled,sp.version AS policy_version,
      an.id AS analysis_id,an.relevance,an.score,an.title_zh,an.summary_zh,an.output
    FROM articles a JOIN sources s ON s.id=a.source_id
    LEFT JOIN source_auto_public_policies sp ON sp.source_id=s.id
    JOIN LATERAL (SELECT * FROM analyses WHERE article_id=a.id AND input_revision=a.revision ORDER BY id DESC LIMIT 1) an ON true
    WHERE a.id=${articleId} AND a.processing_state='analyzed' AND an.origin='model'
    FOR SHARE OF s`;
  if (!row) return { admit: false, granted: false, reason: "缺少当前版本的模型分析" };
  const decision = evaluateAutoPolicy({
    source: {
      enabled: row.source_enabled, tier: row.tier, kind: row.kind,
      participationMode: row.participation_mode, firstParty: row.first_party,
      ownerEntityId: row.owner_entity_id, feedUrl: typeof row.config?.feedUrl === "string" ? row.config.feedUrl : null,
      autoPublicEnabled: row.auto_enabled === true,
    },
    article: { url: row.url, title: row.title, body: row.body_text ?? "", bodyStatus: row.body_status },
    analysis: {
      relevance: row.relevance, itemType: typeof row.output?.itemType === "string" ? row.output.itemType : null,
      authorRole: typeof row.output?.authorRole === "string" ? row.output.authorRole : null,
      score: row.score, titleZh: row.title_zh ?? "", summaryZh: row.summary_zh ?? "",
    },
  });
  const [humanDecision] = await tx`SELECT 1 FROM audit_log WHERE subject=${`content:${articleId}`}
    AND action='content.review' LIMIT 1`;
  const [override] = await tx`SELECT 1 FROM editorial_overrides WHERE article_id=${articleId} LIMIT 1`;
  const held = humanDecision ? { admit: false, reason: "此内容已有人工审核决定，后续版本需人工复审" }
    : override ? { admit: false, reason: "此内容含人工修订，需人工复审" } : decision;
  await tx`UPDATE analyses SET output=jsonb_set(coalesce(output,'{}'::jsonb),'{autoPolicy}',${tx.json(held as never)},true)
    WHERE id=${row.analysis_id}`;
  if (!held.admit) return { ...held, granted: false };

  const proposal = await getReviewProposal(articleId, tx);
  if (!proposal || proposal.analysisId !== row.analysis_id || proposal.sourcePolicyVersion !== row.policy_version) {
    return { admit: false, granted: false, reason: "审核目标已变化，转人工复审" };
  }
  const [previous] = await tx<{ status: string; fingerprint: string | null; version: number }[]>`
    SELECT status,fingerprint,version FROM editorial_reviews WHERE article_id=${articleId} FOR UPDATE`;
  if (previous?.status === "auto_public" && previous.fingerprint === proposal.fingerprint) {
    return { ...held, granted: false };
  }
  if (previous && previous.status !== "pending" && previous.status !== "auto_public") {
    return { admit: false, granted: false, reason: "已有审核决定，转人工复审" };
  }
  await tx`INSERT INTO editorial_reviews (article_id,status,fingerprint,article_revision,analysis_id,override_version,
      source_policy_version,version,reviewed_by,reason,reviewed_at)
    VALUES (${articleId},'auto_public',${proposal.fingerprint},${proposal.articleRevision},${proposal.analysisId},
      ${proposal.overrideVersion},${proposal.sourcePolicyVersion},${(previous?.version ?? 0) + 1},'auto-policy',${held.reason},now())
    ON CONFLICT (article_id) DO UPDATE SET status=EXCLUDED.status,fingerprint=EXCLUDED.fingerprint,
      article_revision=EXCLUDED.article_revision,analysis_id=EXCLUDED.analysis_id,
      override_version=EXCLUDED.override_version,source_policy_version=EXCLUDED.source_policy_version,
      version=EXCLUDED.version,reviewed_by=EXCLUDED.reviewed_by,reason=EXCLUDED.reason,
      reviewed_at=EXCLUDED.reviewed_at,updated_at=now()`;
  await tx`UPDATE editorial_curations SET status='pending',fingerprint=NULL,review_version=NULL,
    version=version+1,reviewed_by=NULL,reason=NULL,reviewed_at=NULL,updated_at=now()
    WHERE article_id=${articleId}`;
  await tx`INSERT INTO audit_log (actor,action,subject,reason,before,after)
    VALUES ('auto-policy','content.auto_public',${`content:${articleId}`},${held.reason},
      ${tx.json(previous ? { status: previous.status, version: previous.version } : null)},
      ${tx.json({ status: "auto_public", version: (previous?.version ?? 0) + 1, fingerprint: proposal.fingerprint })})`;
  return { ...held, granted: true };
}
