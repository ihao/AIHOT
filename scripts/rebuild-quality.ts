// One-time quality repair. Dry-run by default; --apply only rebuilds saved public projections.
// Run with the worker paused. It never calls models or rewrites original material/analysis/receipts.
import assert from "node:assert/strict";
import { SELECTION } from "@aihot/industry/selection";
import { closeDb, sql } from "@aihot/backend/db";
import { publishArticle } from "@aihot/backend/publication/publish";
import { qualityRejection } from "@aihot/backend/publication/rules";
import { computeHotRanking } from "@aihot/backend/events/hot";
import { listedCondition, seatedCondition, selectedCondition } from "@aihot/backend/publication/scope";
import { stopBoss } from "@aihot/backend/jobs/queue";

const apply = process.argv.includes("--apply");
assert.ok(process.argv.slice(2).every(arg => arg === "--apply"), "Only --apply is supported; no argument performs a dry run");
const protectedTables = ["articles", "analyses", "receipts", "receipt_attempts", "sources", "editorial_overrides", "budgets", "model_cost_policy", "settings", "reports"];

async function snapshot() {
  return sql.begin(async tx => {
    await tx`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY`;
    const now = new Date();
    const listed = await tx<{ article_id: string }[]>`SELECT p.article_id FROM publications p WHERE ${listedCondition(now)} ORDER BY p.article_id`;
    const selected = await tx`SELECT p.* FROM publications p WHERE ${selectedCondition(now)} ORDER BY p.article_id`;
    const seated = await tx<{ article_id: string }[]>`SELECT p.article_id FROM publications p WHERE ${seatedCondition(now)} ORDER BY p.article_id`;
    const protectedRows: Record<string, { count: number; hash: string }> = {};
    for (const table of protectedTables) {
      const [fingerprint] = await tx<{ count: number; hash: string }[]>`
        SELECT count(*)::int AS count, md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' ORDER BY md5(to_jsonb(t)::text)),'')) AS hash
        FROM ${tx(table)} t`;
      protectedRows[table] = fingerprint!;
    }
    return { at: now.toISOString(), listed: listed.map(p => p.article_id), selected, seated: seated.map(p => p.article_id), protectedRows };
  });
}

try {
  const before = await snapshot();
  const rows = await sql<{
    article_id: string; title: string; selected: boolean; eligible: boolean; story_id: number | null;
    source_id: string; score: number | null; relevance: string | null; prefilter_label: string | null; fields: Record<string, unknown> | null;
  }[]>`SELECT p.article_id,p.title,p.selected,p.eligible,p.story_id,p.source_id,n.score,n.relevance,
      n.output->'prefilter'->>'label' AS prefilter_label,e.fields
    FROM publications p JOIN sources s ON s.id=p.source_id
    LEFT JOIN LATERAL (SELECT score,relevance,output FROM analyses WHERE article_id=p.article_id ORDER BY input_revision DESC,id DESC LIMIT 1) n ON true
    LEFT JOIN editorial_overrides e ON e.article_id=p.article_id
    WHERE p.visibility <> 'withdrawn' AND s.participation_mode='editorial' ORDER BY p.article_id`;
  const targets = rows.flatMap(row => {
    const f = row.fields ?? {};
    const score = f.score === null || typeof f.score === "number" ? f.score : row.score;
    const stored = row.prefilter_label === "UNKNOWN" ? "unknown" : row.prefilter_label === "BLOCK" ? "block" : row.relevance;
    const relevance = typeof f.relevance === "string" ? f.relevance : stored;
    const reason = qualityRejection({ score, relevance });
    return reason ? [{ id: row.article_id, title: row.title, sourceId: row.source_id, score, prefilter: row.prefilter_label,
      reason, listed: before.listed.includes(row.article_id), selected: row.selected, storyId: row.story_id }] : [];
  });
  // This release promises to preserve the selected set. Surface any conflicting manual decision
  // before the first mutation, rather than silently selecting which requirement to violate.
  assert.ok(targets.every(row => !row.selected), "Quality repair would change a selected publication; inspect the dry-run plan");
  const ids = targets.map(row => row.id);
  const reportReferences = ids.length ? await sql`
    SELECT kind,key FROM reports WHERE content::text LIKE ANY(${ids.map(id => `%${id}%`)}::text[]) ORDER BY kind,key` : [];
  let rebuilt = 0;
  let changed = 0;
  if (apply) {
    for (const row of targets) {
      const result = await publishArticle(row.id);
      assert.equal(result?.visibility, "withdrawn", `Quality repair failed for ${row.id}`);
      rebuilt += 1;
      if (result?.changed) changed += 1;
    }
    if (targets.length) await computeHotRanking();
  }
  const after = apply ? await snapshot() : before;
  assert.deepEqual(after.protectedRows, before.protectedRows, "Originals, saved judgements, receipts or operating settings changed during repair");
  assert.deepEqual(after.selected, before.selected, "Selected publications changed during repair");
  assert.deepEqual(after.seated, before.seated, "Selected machine representatives changed during repair");
  if (apply) assert.deepEqual(after.listed, before.listed.filter(id => !ids.includes(id)), "Unexpected change to public set");
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", floor: SELECTION.publicFloor, before, targets,
    listedRemoved: targets.filter(row => row.listed).length, reportReferences, rebuilt, changed, after, conserved: true }, null, 2));
} finally {
  await stopBoss();
  await closeDb();
}
