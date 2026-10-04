# Model Budget Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan. Steps use checkbox syntax for tracking.

**Goal:** Deploy a shared 9 CNY model guard and assessed ordinary-verifier routing while preserving factual authority and existing public grants.

**Architecture:** Atomically reserve every paid model attempt in the existing receipt boundary. Persist verification execution policy per new round; retain legacy payload/configuration. An independent assessment decides whether production ordinary routing is enabled.

**Tech Stack:** Node 24 TypeScript, PostgreSQL 17 production and acceptance, local PostgreSQL 14 fast tests, React frontend.

## Task 1: Atomic cost ledger

Files: `database/migrations/0048_model_cost_budget.sql`, `packages/backend/src/providers/model-cost.ts`, `providers/receipts.ts`, `providers/llm.ts`, `providers/embeddings.ts`, `admin/runs.ts`, `tests/model-cost-budget.test.ts`.

- [x] Write red tests for 9 CNY daily + rolling limits, cross-service concurrency, UTF-8 bounds, cache settlement, missing prices/usage, unknown retention, known rejection release, 5xx retention, retries and exact reuse.
- [x] Run the tests against the isolated database and confirm intended failures.
- [x] Add optional monetary strategy, CNY price snapshots, reserved/settled attempt costs and conservative historical-window accounting. Implement request metadata without changing stable logical identity. Disable automatic unknown-model re-purchase when money policy is enabled; test manual billed/unknown retention and explicit unbilled release.
- [x] Run targeted receipt/budget tests, typecheck, and review.

## Task 2: Verifier routing and bounded evidence execution

Files: `database/migrations/0049_verification_execution.sql`, `packages/backend/src/editorial/verification-execution.ts`, `editorial/automatic-verification.ts`, `providers/llm.ts`, `tests/verification-execution.test.ts`, `tests/model-presets.test.ts`.

- [x] Add red tests for ordinary vs risk route, immutable original risk, original quote ID/full-paragraph context, over-limit refusal, duplicate evidence, legacy round payload/configuration/reuse.
- [x] Persist `execution_policy` defaulting to legacy for existing rounds; use an explicit policy for new rounds. Add dashscope DeepSeek preset, keep factual rule fingerprint unchanged.
- [x] Use deterministic risk routing gated by explicit deployment activation; reduce new-round maximum output while retaining exact legacy configuration. Preserve full evidence in database and use conservative bounded literal evidence packets.
- [x] Run relevant automatic verification/publication/recovery tests and typecheck; review.

## Task 3: Operational reporting and assessment

Files: `packages/backend/src/admin/models.ts`, `admin/review.ts`, `packages/contracts/src/automatic-content.ts`, `apps/web/app/features/admin/labels.ts`, existing admin model view/contracts, `scripts/eval-verification.ts`, research acceptance Markdown/JSON.

- [x] Show amount policy, reserved/estimated usage and natural-day/rolling windows with clear billing boundary; verify cache accounting in existing overview.
- [x] Build at least 100 evidence-grounded claim cases from at least 40 real articles: 40 ordinary official supported, 40 ordinary official contradicted/unsupported mutations and 20 risk/secondary boundaries; document analyst/agent labels separately from user annotations.
- [ ] Run isolated offline fixtures. After phase-1 release has enabled monetary protection, run bounded production assessment through the same ledger; zero ordinary false acceptance, at least 95% supported full-gate acceptance, 100% structure/citation validity and no unexplained differences are required. Record dataset/hash/scope/costs and all differences.
- [ ] Enable ordinary model only if required quality gates pass; never bypass budget to finish the assessment.

## Task 4: Full gate and production release

- [x] Run typecheck, backend full tests, frontend tests/build and local HTTP smoke. Full acceptance repeats on Node 24/PostgreSQL 17 with internal-only network, no real credentials or external model access.
- [x] Request final spec compliance followed by code-quality review, resolve important findings, commit only scoped work, integrate without altering unrelated main-directory changes.
- [x] Build immutable production image, run image tests, create existing backup-service snapshot and save old mirror/config checks. Stop only 9BTC worker, migrate, enable monetary policy and account historical windows before restoring paid work; routing stays disabled. Safe rollback restores old API/web with model valves disabled and leaves worker stopped.
- [ ] Perform protected assessment and enable eligible routing only after gates pass in audited transaction; legacy already-spent windows remain charged. Preserve rule/source/public IDs; verify public smoke and fresh bounded-request evidence.
- [ ] Save deploy/assessment acceptance and explain actual bill savings still require a completed day. Preserve recoverable checkout; clean temporary test containers and local database when finished.

## Release checkpoint (2026-10-04 23:39 Beijing)

Runtime commit `14ba61e` is deployed. Node 24/PostgreSQL 17 full gate passed (451 backend,18 frontend,30 HTTP); preservation and public production smoke passed. Shared 9 CNY day and rolling guard is enabled with historical costs retained. The first real assessment was safely blocked with zero attempts. Ordinary routing remains disabled pending the protected 100-case gate. Historical-only forecast first allows the largest single assessment reservation at approximately 2026-10-05 00:27:44 Beijing; real admission always uses the database clock. Temporary test services have been cleaned up.
