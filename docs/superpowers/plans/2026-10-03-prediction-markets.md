# Prediction Markets Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 上线已批准的第9“预测市场”主题，保持既有公开内容、核验资格和历史处理限制。

**Architecture:** 修改行业主题/词汇/提示词，由现有发布和主题读取层聚合。仅为本次词汇扩展登记精确的规则版本兼容，事实核验和评分不变；版本兼容在公开读取、当前决定和恢复扫描中一致生效。生产标签修正限近一个月已有公开候选，采用事务和审计，固定提交部署后核验。

**Tech Stack:** Node24、TypeScript、PostgreSQL17、React Router、Docker Compose。

---

## Task 1: Configuration, version compatibility and meaningful regression tests

Files:
- Modify `industry/topics.json`, `industry/taxonomy.ts`, `industry/prompts/prefilter.md`, `industry/prompts/content-understanding.md`, `industry/prompts/structure.md`, `industry/prompts/rules-domain.md`.
- Create `industry/automatic-rule-compatibility.ts` with an exact current→previous version map and a default-closed helper; the previous production version is `automatic-publication-v1:5c0e3a85b0b01eeb31df0874`.
- Modify `packages/backend/src/editorial/automatic-verification.ts` only where required to preserve compatible accepted grants and avoid replaying them. Do not change scoring, verification/rewrite prompts, evidence policy, freshness or numeric thresholds.
- Modify `tests/industry-web3.test.ts`, `tests/automatic-verification.test.ts`; add a focused topic aggregation integration test if existing files do not cover the new field tag.

- [x] Add failing tests for normalization: `Prediction Market`, `prediction markets`, `預測市場` map to `预测市场`; `price prediction`, `预测`, `市场` are dropped, not mapped. Assert topic config/whitelist coherence and rendered prompt tag availability.
- [x] Add integration regressions using existing offline verification stubs: an accepted prior-version grant remains visible only for this release, preserves exact-copy/analysis/source checks, is not replayed by sweep; a current-version waiting/rejected record suppresses old accepted fallback; unrelated versions are blocked. Topic pages include selected tagged publications and exclude plain pool/withdrawn publications.
- [x] Run focused tests to prove new behavior fails before implementation (no external services).
- [x] Implement the 9th topic immediately after the existing field topics, label `预测市场`, field group, related defi/regulation/security/research. Add explicit synonyms, no platform names or generic prediction words as synonyms.
- [x] Add clear tag and prefilter semantics with platform/type distinction and probability/settlement guard. Preserve existing score prompt and categories/types.
- [x] Compute the new `AUTOMATIC_RULE_VERSION` after prompt edits, then bind this exact version to the previous version in the compatibility map. On any other current version return only itself. Build SQL conditions using parameterized fragments (avoid cold-connection array assumptions). Old-version compatible grants qualify only if no current-version record exists for the same article revision; keep every other gate intact. Recovery skips valid compatible accepted rounds but still handles invalid/new inputs normally.
- [x] Run focused tests and typecheck, inspect diff and commit only this task's files. Record any existing unrelated full-suite failure separately.

## Task 2: Full verification and release

Owner: primary agent, production mutations are sequential and authorized by the user. Backend tests use an isolated `_test` database with offline provider guard; no production fixtures or paid requests.

- [x] Run complete typecheck, backend tests, webpage tests and build. Preserve the known prior manual event-date failure if still reproducible; do not fix unrelated behavior here.
- [x] Perform independent spec and code-quality reviews, fix material problems, re-run only affected checks.
- [x] Query production public candidates and manually choose unambiguous recent prediction-market items; skip unknown dates, older than one month and nonpublic inputs. Save selected/public statuses before any change.
- [x] Snapshot current public IDs, topic config, source counts, receipt totals and current image. Build a fixed Git commit release. Preserve runtime sources/admin settings and other Docker projects; do not rerun old source initialization.
- [x] Deploy the tested image for api/web/worker, seed topics via `seedTopics()` only. In a transaction lock each chosen publication, recheck unchanged title/summary/date/public eligibility, append the canonical tag and add an audit record. Do not mutate analyses, verification records, review fingerprints, selected states or scores.
- [x] Verify `/api/site/topics` has 9, `/topics/prediction-markets` returns200 with correct definition, roles load the new tag/prompt and compatibility pair, preexisting public IDs remain eligible unless independently withdrawn, tag repair preserves selected status and receipt count, sources and budget settings remain unchanged. Run public 30-check smoke.
- [x] Save sanitized release and verification evidence, update assessment status, apply topic code commits to the primary feature branch without touching prior source changes, and report any remaining real-content boundary.

Rollback: retain prior image and topic/tag snapshot; revert only this release's topic/tag rows and application image. Never reset database history or budget receipts.
