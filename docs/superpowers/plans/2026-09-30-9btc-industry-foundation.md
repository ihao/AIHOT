# 9BTC Industry Foundation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the AI demo industry pack into a coherent, buildable 9BTC Web3 site without importing unreviewed sources or calling paid services.

**Architecture:** Keep the framework's public contracts and processing pipeline. Replace the `industry/` pack, its example-dependent tests, and CI's seed assertion. Source research, editorial approval, and EU deployment are separate follow-on plans; this phase must not connect real production sources.

**Tech Stack:** Node.js >=24.11, TypeScript 7, React Router, PostgreSQL 17 in CI, npm workspaces, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-30-9btc-web3-design.md`

---

## File map and guardrails

| Unit | Files | Responsibility |
|---|---|---|
| Identity | `industry/site.ts`, `industry/features.ts`, `industry/brand/*`, `industry/changelog.json`, `apps/web/app/components/Logo.tsx` | Public name, About copy, AI-only switches, visual identity |
| Taxonomy | `industry/taxonomy.ts`, `industry/topics.json`, `packages/contracts/src/taxonomy.ts` | Seven stable category keys, tags, entities, topics; contracts derive keys from industry data |
| Editorial language | `industry/prompts/*.md`, `industry/selection.ts` | Web3 relevance, factual summaries, classification, grouping, report language; numeric thresholds stay provisional until evaluation |
| Seed | `industry/sources.json`, `scripts/seed.ts`, `.github/workflows/check.yml` | No AI demo sources in a fresh 9BTC database |
| Verification | `tests/analyze.test.ts`, `tests/industry-web3.test.ts`, existing tests with AI fixtures, web build/tests | Prove schema, category and source behavior; preserve unrelated framework tests |

Do not rename npm workspace packages or internal `@aihot/*` imports just to change branding. Do not alter `LICENSE` or `NOTICE`. Do not use a real LLM key, enable collection, or ingest sources in this plan. The macOS host currently has PostgreSQL 14, while the project requires 16/17; database tests should run against PostgreSQL 17 in CI or a separate test service, never a shared application database.

### Task 1: Establish a safe local baseline

**Files:** No source edits.

- [ ] **Step 1: Install dependencies.** Run `npm ci --no-audit --no-fund` at repository root. Expect a completed install and no lockfile modification.
- [ ] **Step 2: Run baseline checks.** Run `npm run typecheck` and `npm run build -w @aihot/web`. Record any pre-existing failure before changing code.
- [ ] **Step 3: Inspect the branch.** Run `git status --short --branch`; expect `feat/9btc-web3` and a clean working tree apart from this plan document.

### Task 2: Replace public identity and disable AI-only modules

**Files:** Modify `industry/site.ts`, `industry/features.ts`; create `tests/industry-web3.test.ts`.

- [ ] **Step 1: Write a behavioral identity test.** The test imports `SITE`, `ABOUT`, and `FEATURES` and asserts `SITE.name === "9BTC"`, `SITE.subject === "Web3"`, `SITE.mcpPrefix === "ninebtc"`, `SITE.crawlerName === "9BTCBot"`, About text mentions Web3, and both AI-only flags are `false`. Run `node --test tests/industry-web3.test.ts`; expect failure on current demo values.
- [ ] **Step 2: Change the identity.** Set the site title to `9BTC — Web3 热点与研究`, description to a factual Chinese summary of the site's source-linked coverage, tagline to `Web3 热点与研究`, organization to `9BTC`, and footer to a 9BTC attribution that preserves the original MIT/NOTICE in the repository. Rewrite About copy to describe curated sources and source-linked summaries; add the daytime/evening review claims only after the separate approval workflow is implemented. Do not promise a fixed publishing hour. Leave `contactEmail` null until the user supplies a real address; do not invent an operator.
- [ ] **Step 3: Disable AI-only features.** Set `FEATURES.leaderboard` and `FEATURES.codexResetMonitor` to `false`; retain implementation modules for now. Run the new test and `npm run typecheck`; expect PASS.
- [ ] **Step 4: Commit.** Stage only these three files, check `git diff --cached --check`, and commit `feat: establish 9BTC identity`.

### Task 3: Define Web3 taxonomy and stable topics

**Files:** Modify `industry/taxonomy.ts`, `industry/topics.json`, `tests/industry-web3.test.ts`; update example-dependent assertions in `tests/analyze.test.ts` only when their behavior is exercised.

- [ ] **Step 1: Extend the taxonomy test before edits.** Assert the ordered category keys are exactly `infrastructure`, `defi`, `stablecoin-rwa`, `security`, `policy`, `industry`, `research`; assert keys unique and each has label/section/guide. Assert topic slugs unique, every `related` slug exists, and each topic's entityId/tags resolves to the new Web3 vocabulary. Run the test; expect failure.
- [ ] **Step 2: Replace taxonomy data.** Use the seven approved labels. Set Web3 category tags and item types for protocol upgrade, DeFi/product change, stablecoin/RWA, security incident, policy event, governance/business change, and research/analysis. Include canonical entities and aliases for Bitcoin, Ethereum, Solana, Uniswap, Aave, Chainlink and regulators only where a source can substantiate identity. Treat `BTC` and `ETH` as assets distinct from organizations; never infer an entity from a ticker alone. Ensure `CATEGORY_BY_ITEM_TYPE` maps every item type to an allowed category tag.
- [ ] **Step 3: Replace topics.** Use `company`/`field`/`genre` groups already supported by the schema, but relabel them for projects/institutions, directions and content forms. Include a small first set of stable slugs for bitcoin, ethereum, solana, defi, stablecoins, security, regulation, research; no speculative project pages. Run `node --test tests/industry-web3.test.ts` and `npm run typecheck`; expect PASS.
- [ ] **Step 4: Update relevant test fixtures.** In `tests/analyze.test.ts`, replace AI model/category/tag fixtures with Web3 equivalents while preserving what each test proves (output schema, vocabulary normalization and identity protection). Run its targeted test against a PostgreSQL 17 test database when available; do not weaken assertions merely to pass.
- [ ] **Step 5: Commit.** Stage only taxonomy/topics and affected tests, check staged diff, commit `feat: add Web3 taxonomy and topics`.

### Task 4: Replace AI-specific scoring and writing rules

**Files:** Modify `industry/prompts/prefilter.md`, `selection-score.md`, `content-understanding.md`, `structure.md`, `rules-domain.md`, `identity-context.md`, `group-definitions.md`, `group-method.md`, `group-pair.md`, `story-digest.md`, `report-daily-lead.md`, `report-period.md`, `summarize-article.md`, `summarize-article-empty.md`, `summarize-long-post.md`, `summarize-short-post.md`, `translate-body.md`, `translate-post.md`, `understand.md`, `industry/selection.ts`; inspect the remaining prompt files for AI examples and update only where needed.

- [ ] **Step 1: Preserve output contracts.** Read `packages/backend/src/editorial/analyze.ts`, `writing.ts`, `prompts.ts` and `tests/analyze.test.ts`; record the JSON fields and partial-template references. Do not change field names or parser contracts while replacing content.
- [ ] **Step 2: Draft the Web3 rules.** Replace AI readership/examples with the approved facts-and-research boundary. Explicitly downgrade pure price movement, targets, referral/airdrop promotion, vague partnerships and unsupported whale narratives. Require source, chain, unit, observation time and stage for numbers and governance; distinguish exploit estimate, actual loss, frozen and recovered amounts. Preserve prompt-injection isolation and the five-axis scoring structure. Define one weight row per new item type, each totaling 10, and keep the only scoring output as `{"attentionScore": 0}` shape.
- [ ] **Step 3: Align classification and composition.** Make `content-understanding.md` item types and first-tag rules match `industry/taxonomy.ts`; update domain, grouping and report prompts so same ticker across chains is not automatically the same entity and “proposal/discussion/passed/executed” remain distinct stages. Search with `rg -n 'AI 圈|大模型|model_release|product_launch|AI 日报|OpenAI|Anthropic|Codex' industry/prompts` and inspect each hit; expected result is no irrelevant AI-specific guidance, not a blanket deletion of factual AI×Crypto references.
- [ ] **Step 4: Keep thresholds explicitly uncalibrated.** Preserve the current `industry/selection.ts` numeric values only as temporary evaluation defaults, label them uncalibrated for Web3, and do not claim they are launch-ready. The later source/evaluation plan must use 100–200 user-reviewed Web3 examples before publication is enabled.
- [ ] **Step 5: Verify and commit.** Run `npm run typecheck`, `npm run build -w @aihot/web`, and targeted prompt/analysis tests with stubs. Stage only prompt/selection and test changes, check staged diff, commit `feat: define Web3 editorial rules`.

### Task 5: Remove demo source ingestion and update CI

**Files:** Modify `industry/sources.json`, `.github/workflows/check.yml`; inspect `scripts/seed.ts` without changing it unless the empty list fails.

- [ ] **Step 1: Make the seed empty.** Set `industry/sources.json` to a documented `{"sources":[]}` object. Do not replace AI sources with unreviewed Web3 candidates. Confirm JSON parsing and source count zero with a local Node command.
- [ ] **Step 2: Update CI's explicit fixture assertion.** In `.github/workflows/check.yml`, change the Docker seed check from 18 sources to 0 sources, and make the assertion message explain that Web3 sources require a separate study. Keep collection/model calls disabled in CI.
- [ ] **Step 3: Run checks.** Run the industry test, typecheck and Web build. On PostgreSQL 17, run migrations, `scripts/seed.ts`, and verify the new database has zero sources and the Web3 topic rows. Existing nonempty development DBs are not proof because seed does not delete old sources.
- [ ] **Step 4: Commit.** Stage only the source JSON and CI/workflow changes, inspect diff and commit `chore: remove AI demo source seed`.

### Task 6: Brand assets and representative regression

**Files:** Modify `industry/brand/logo.svg`, `icon.png`, `icon-192.png`, `apple-icon.png`, `favicon.ico`, report nameplates, `industry/brand/nameplates/index.json`, and `industry/changelog.json` as required; inspect `apps/web/app/routes/hot.tsx`, `topics.tsx`, `feedback.tsx`, and adjust `apps/web/app/components/Logo.tsx` only if the existing text wordmark cannot express 9BTC. Modify AI-specific fixture names in existing tests only where they assert product behavior rather than generic framework behavior.

- [ ] **Step 1: Produce a restrained 9BTC visual identity.** Keep the existing wordmark component if it renders `SITE.name` correctly. Replace the default AIHOT-derived favicon/app icons and report nameplates with a readable 9BTC/Web3 mark. Verify actual PNG dimensions and inspect the rendered assets; keep image-generation output as raster assets.
- [ ] **Step 2: Check UI surfaces.** Run Web build and inspect home, About, categories, topics, report headings, browser icon, RSS metadata and sharing metadata. Search and fix visible AIHOT/MyHOT demo copy, including `hot.tsx`, `topics.tsx`, `feedback.tsx`, and `industry/changelog.json`; do not rename internal package namespaces or claim review features before they exist.
- [ ] **Step 3: Run representative regression.** Run `npm run typecheck`, `npm run build -w @aihot/web`, `node --test apps/web/tests/*.test.ts`, and PostgreSQL 17-backed `npm test`. Run `node scripts/smoke.ts --base http://127.0.0.1:3000` with collection/model calls off when a local or CI site is running. Report CI-only checks honestly if PostgreSQL 17 is unavailable locally.
- [ ] **Step 4: Commit.** Stage only verified brand/test corrections, inspect staged diff and commit `feat: finish 9BTC industry foundation`.

## Exit criteria and next plans

The phase ends with a buildable 9BTC-branded site, seven valid Web3 categories, Web3 editorial prompts, both AI-only features off, zero demo sources in a fresh database, and passing available checks. It is **not** ready for public DNS: real sources, calibrated thresholds, the approval workflow, legal pages, model budget and EU operations are separate work.

Create focused follow-on plans from the same approved spec for (1) editorial review and cross-channel publication, (2) source-study/evaluation plus controlled ingestion, and (3) EU deployment and public cutover. Do not skip their gates merely because this foundation plan passes.
