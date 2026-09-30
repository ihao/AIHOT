# 9BTC Editorial Review and Publication Plan

> **For agentic workers:** REQUIRED: execute with subagent-driven-development (or executing-plans when delegation is unavailable). Each task needs a focused failing test first, scoped implementation, independent spec and quality review, and a scoped commit. Do not deploy a partial gate.

**Goal:** Make every public exit obey the approved two-lane policy: a narrow, explicitly allowed low-risk official feed may appear in 全部动态; selected content, events and reports require human approval. No unreviewed material may leak through detail, search, RSS, API, MCP, sitemap, images or cached projections.

**Design:** `docs/superpowers/specs/2026-09-30-9btc-web3-design.md`. This is a follow-on to `2026-09-30-9btc-industry-foundation.md`. The EU deployment and real-source import remain separate gates.

**Current code facts:** `publishArticleTx` presently derives `visibility='public'` by default. The public readers mostly use `publications`, but `hasItemPage` admits `summary-only` pages and event/hot queries have their own filters. `composeDaily` writes directly into the publicly read `reports` table; `apps/worker/src/schedules.ts` generates it at 08:00 and catch-up can regenerate it. None of these behaviors meets the approved review policy yet.

**Working rules:** Implement in small commits and run the affected PostgreSQL 17 integration tests in CI. Local PostgreSQL 14 is insufficient. Use a fresh isolated test database, never an existing application database. Never enable real collection or paid model calls in tests. Keep existing `@aihot/*` internal package names and public API field contracts unless a reviewed migration explicitly changes them.

**Release unit:** Tasks 1–6 are one non-public implementation unit. A migration adding closed review records alone cannot protect rows already marked `visibility='public'`; do not deploy any intermediate commit. The final migration/read gate must hide every pre-existing item and report without a valid 9BTC approval, and an upgrade test must start from a database containing public AIHOT rows. Review status is never inferred from existing `visibility` or old report presence.

**Implementation slices (each gets its own test, review and commit; none is deployable alone):**

| Slice | Main files | Proof before next slice |
|---|---|---|
| A: schema and proposal | `database/migrations/0039_editorial_review.sql`, `packages/backend/src/editorial/review.ts`, `tests/editorial-review.test.ts` | Fresh/reused DB remains closed; stale analysis cannot form a proposal |
| B: projection and approval transaction | `publication/publish.ts`, `admin/content.ts`, `apps/api/src/routes/admin.ts`, `tests/publication.test.ts` | Approve/reject/stale-tab/selected ledger behavior |
| C: mutation invalidation | `content/materials.ts`, `content/extract.ts`, `editorial/{analyze,translate}.ts`, `admin/sources.ts`, integration tests | Concurrent reads never see changed live material under old approval |
| D: auto policy and queue | `editorial/auto-policy.ts`, `admin/review.ts`, `apps/web/app/routes/admin/review*.tsx`, API/admin tests | Auto all-only, risk exclusions, 30-minute queue |
| E: event scope | `events/group.ts`, `events/hot.ts`, `events/hot-read.ts`, `publication/stories.ts`, `items.ts`, `detail.ts`, `tests/events.test.ts` | Pending/auto evidence cannot supply public event text, counts or links |
| F: remaining exits and caches | `publication/{pool,feeds,v1,sitemap,reports,...}.ts`, public API/Web routes, `tests/{publication,listings}.test.ts` | Every public response respects review state and revocation cache policy |
| G: report schema and draft | `database/migrations/0040_report_review.sql`, `reports/compose.ts`, `tests/report-candidates.test.ts` | Draft never appears in public reports; published version cannot be overwritten |
| H: report approval and schedule | `admin/reports.ts`, admin API/Web, `apps/worker/src/schedules.ts`, report/publication tests | Atomic candidate-set validation; no 08:00 auto release or empty issue |

## Task 1 — Persistent decisions and immutable approval target

**Files:** New migration after `0038`; backend editorial review module; focused database tests.

- [ ] **Step 1:** Add a review record separate from `publications.visibility`. Track `pending`, `approved`, `rejected`, and `auto_public`; reviewer, reason, timestamp, version and exact proposed-content fingerprint. Store a separate curated/selected approval so an auto-public all-feed item cannot become selected by a later model or source-tier change.
- [ ] **Step 2:** Fingerprint article revision/content identity, latest current-revision analysis id, manual override version, and source fields or policy version affecting attribution/licence/public scope. A candidate exists only if its analysis `input_revision = articles.revision` and processing succeeded. An old analysis arriving late or an extracted body awaiting reanalysis is pending, never approvable. Test those races explicitly.
- [ ] **Step 3:** Add explicit per-source auto-public allowlist, default **off** for every source. It is a prerequisite, never a blanket approval. Changes are version checked and audited. Do not allowlist real sources in this plan.
- [ ] **Step 4:** Verify migrations on fresh and reused databases. No existing item/report may acquire approval by migration. Run focused migration tests, then `npm run typecheck`.

## Task 2 — Atomic publication gate and invalidation

**Files:** `packages/backend/src/publication/publish.ts`, `rules.ts`, content/material processing callers, ledger and selected notification code; `tests/publication.test.ts` or a new focused integration suite.

- [ ] **Step 1:** Under the article row lock, read the current proposal, compare-and-set its fingerprint, write the review decision and call `publishArticleTx` **in one transaction**. Define one lock order for article, source policy and report-candidate locks. A stale browser tab or late model result must fail closed.
- [ ] **Step 2:** A valid `approved` decision may enter 全部动态; only a separate curated approval may set `selected=true`, enter home/event/hot/report, send selected notifications or enter the selected ledger. A valid `auto_public` decision is forced to `selected=false`. Pending/rejected projections use `visibility='withdrawn'`; `summary-only` cannot expose them.
- [ ] **Step 3:** Close the mutation-to-reprojection window. `content/materials.ts`, `content/extract.ts`, `editorial/analyze.ts`, `editorial/translate.ts` (including quote translations), `admin/content.ts`, `admin/sources.ts` and any other material/source writers currently commit before republishing. Each must synchronously downscope the old public projection in its mutation transaction **or** every public read must validate an immutable approved snapshot against the current source/article/review version. Apply both where necessary for defence in depth. A→B→A changes must not resurrect an old approval even if the fingerprint returns to the original value. Do not return live `articles` body, X text or source data beside an older approval. Selected ledger and event/hot visibility must revoke in the same effective step.
- [ ] **Step 4:** A material change invalidates approval; do not carry `selected_ready_at`/`visible_after` from the revoked version into reapproval. Preserve an explicit version-specific release time. Reapproval across a report cutoff must be eligible once unless that item was already cited in a published issue; a corrected already-cited item updates its citation availability rather than silently duplicating itself.
- [ ] **Step 4a:** `grouped_at` currently participates in the proposal fingerprint, but grouping can set it asynchronously. Decide and test the ordering: either grouping completes before approval, or grouping invalidates/requeues affected approval without silently disappearing from 全部动态. A changed fact/story link also needs a fresh curation decision before entering public events.
- [ ] **Step 5:** Test fresh pending, valid approval, auto all-only, title/body revision, extracted-body race, late old analysis, override, source settings, new body/quote translation, A→B→A restoration, process crash/concurrent read between mutation and republish, withdrawal and reapproval. Assert real endpoint and sync-ledger behavior, not only a helper boolean. Run `node --test tests/publication.test.ts` with an isolated PostgreSQL 17 database.

## Task 3 — Conservative daytime auto lane

**Files:** New editorial risk policy module; source admin schema/API; review decision path; focused tests.

- [ ] **Step 1:** Require explicit source allowlist, verified first-party identity, editorial mode, allowed feed kind/domain, current reliable Chinese summary, and a supported low-risk item type. Start with routine protocol/software release notices only. `output.itemType` is absent on the low-score summarization path today; missing type means **pending**, which deliberately reduces initial auto coverage.
- [ ] **Step 2:** Deterministically exclude safety, regulation, financial/yield claims, exploit/loss/recovery, disputed data and promotion using source title/material **and** generated summary; the classifier alone cannot authorize publication. First-party/T1 alone is insufficient. Record why each candidate was admitted or held.
- [ ] **Step 3:** Auto grant is all-feed only. Human approval is required for selection/event/report. Leave every real source allowlist off pending the source study.
- [ ] **Step 4:** Test a safe release, a release mentioning a CVE, a proposal mistaken for execution, a stablecoin yield claim, missing/late item type and a changed auto-public article. Run the new policy test and PostgreSQL 17 publication tests.

## Task 4 — A 30-minute nightly review queue

**Files:** backend `admin/` module, admin routes, admin Web pages/navigation and focused API/UI tests.

- [ ] **Step 1:** Show pending count, source/original link, original material, Chinese copy, category, score, grouping, revision and risk reason. Prioritize safety, regulation, monetary claims and changes to previously-public material. Separate collection/model failures.
- [ ] **Step 2:** Provide approve all, approve selected, reject and edit-before-approve. Submit displayed fingerprint/version; stale tabs get a conflict. Record actor, reason, before/after and approved version in audit log.
- [ ] **Step 3:** Keep manual corrections and visibility controls compatible; `setVisibility(public)`, republish and retries must not bypass review. An override edit invalidates the old approval before newly edited content can be read publicly.
- [ ] **Step 4:** Verify a 30-minute nightly batch can be reviewed from a concise queue with one-click access to high-risk source evidence. Run focused admin API and Web tests; do not promise fixed publication time.

## Task 5 — Exhaustive public-exit audit

**Files:** `publication/` readers, site/v1/MCP/feed/OG routes, report/event/hot readers, tests.

- [ ] **Step 1:** Inventory every public query of `publications`, `reports`, `facts`, `stories`, `story_signals`, `hot_rankings`, `pool_search` and selected ledger. Auto-public entries appear only in 全部动态, own detail, all-feed RSS, all-mode API and MCP search. They must not enter home/selected feed, event/hot, reports, selected sync or sitemap indexing. Strip event titles/links/related metadata from auto item cards and detail too (`publication/items.ts`, `detail.ts`).
- [ ] **Step 2:** Build event/hot eligibility from **curation-approved** evidence, not merely `visibility='public'`. `events/group.ts` may group pending internally, but fact/story titles, digests, report counts, heat, `hot_rankings.entries`, `hot-read.ts` snapshots and related links must be generated from or filtered to approved evidence. Withdrawals and edits remove/rebuild stale snapshots before an old title or count can leak.
- [ ] **Step 3:** Exercise detail/Markdown, `/all`, `/hot`, story pages, topics, search, feed variants, v1 API, MCP, `llms.txt`, sitemap and share/OG with pending, auto and approved fixtures. Assert no pending ID/title/snippet in body, metadata, counts, item card story hints or stale caches.
- [ ] **Step 3a:** The selected sync API has historical payloads: test an old pagination cursor and `selectedChanges` after withdrawal, then withdrawal→reapproval before the new `visible_after`. Never replay an old upsert title/summary when its exact grant is no longer currently public; a remove/refresh protocol must preserve client convergence without leaking withdrawn content.
- [ ] **Step 4:** Set a practical revocation SLA: same-origin public reads must hide revoked content immediately after commit. Disable shared caching (`no-store`) on **every** response containing revocable title, ID, count or metadata until an end-to-end purge mechanism is proven: home, all, hot, item, story, topics, search, report, feed, OG, v1/site API, MCP, redirects and sitemap. ETag alone does not invalidate an already cached response. Audit `publication/sitemap.ts` persisted XML fallback, `publication/reports.ts` stale report index and hot snapshot caches, and invalidate or recheck at read. External subscribers/search-engine copies cannot be retroactively erased; document that limit. Test `Cache-Control` and stale content after withdrawal across those routes.
- [ ] **Step 5:** Run `node --test tests/publication.test.ts tests/listings.test.ts tests/events.test.ts` and focused RSS/MCP tests on PostgreSQL 17; retain all public-exit assertions when adapting fixtures.

## Task 6 — Draft, approve and publish reports

**Files:** New report-state migration, `reports/compose.ts`, `publication/reports.ts`, report routes, admin report page/API, worker schedules and focused integration tests.

- [ ] **Step 1:** Use append-only `report_drafts` and `report_versions` tables. Keep `reports` as the `(kind,key)` identity and active-version pointer, **never** overwrite published content in place. Public readers join only the approved active `report_versions` row. Reused DB rows without 9BTC approval have no active version and remain hidden. `composeDaily` writes drafts only. Filter `publication/reports.ts`, feeds/v1/MCP, stats, alerts, IndexNow, `llms.txt`, sitemap, navigation and `recentlyCovered` to active published versions.
- [ ] **Step 1a:** Existing `reports.content/window_start/window_end/generated_at` are `NOT NULL`; migration `0040` must either relax/move these legacy fields or create a separate issue-identity table before inserting a new issue. Archive legacy content but leave it without an active approved version.
- [ ] **Step 2:** Replace 08:00 auto release and catch-up with manual nightly flow: finish content review, generate draft from curation-approved released items, inspect source links/facts, approve exact draft version, then publish. Key an issue to its **actual Beijing publication date** and store `[window_start, window_end)` from the previous published cutoff to the current approval cutoff; define a launch-start setting for the first issue. A missed night extends the next window, with no auto empty issue or gap.
- [ ] **Step 3:** Publish under the `report_candidates` lock, atomically recheck draft version, every cited article's valid approval/fingerprint, the **entire** eligible candidate ID/version set in `[window_start, cutoff)`, and the cutoff. A newly approved item whose discovery predates cutoff must not fall between issues: its first report-eligible release time is no earlier than approval commit. A changed candidate set makes the draft stale. Append a `report_versions` row and switch the active pointer atomically; corrected editions require a separately approved draft/version, never silent overwrite.
- [ ] **Step 4:** Freeze each published citation's approved fingerprint/article revision in that report version. A withdrawn **or reapproved-but-changed** article stays marked unavailable in the old issue unless the issue itself is revised and approved; current `visibility` alone is insufficient. Previously cited corrected items do not silently duplicate next night. Weekly/monthly generation stays private or disabled until equivalent approval exists. Remove stale `modelsReleased` metric. Test no future/empty edition, no automatic public catch-up, missed day, stale draft, new item approved before cutoff, existing published key, and approve→invalidate→reapprove across a cutoff.
- [ ] **Step 5:** Run `node --test tests/report-candidates.test.ts tests/report-lead.test.ts tests/publication.test.ts` on PostgreSQL 17 and `npm run typecheck`.

## Task 7 — Acceptance and evidence

- [ ] **Step 1:** Run `npm run typecheck`, `npm run build -w @aihot/web`, Web/no-DB tests locally. On isolated PostgreSQL 17 in CI run `node scripts/migrate.ts`, `node scripts/seed.ts`, `npm test` and focused review regressions. Adapt legacy default-public fixtures with explicit test approvals, never by weakening public assertions.
- [ ] **Step 1a:** The first exploratory full-suite run on local PostgreSQL 14 timed out at `tests/analyze-shutdown.test.ts` while its provider stub still infers AIHOT prompt stages; investigate that test separately after the Web3 prompt change. Do not interpret the interrupted run as a gate pass or a PostgreSQL 17 result.
- [ ] **Step 2:** On a private running site, test nightly queue/report with synthetic Web3 fixtures and model/collection off. Then evaluate real samples under the source-study plan. Distinguish code tests, real-model sample checks and actual EU runtime evidence.
- [ ] **Step 3:** Audit the final diff for secrets, bypasses and direct public queries. Do not push/deploy an intermediate gate. DNS cutover still requires source, legal, budget, backup and EU acceptance gates.
