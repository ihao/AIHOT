# 9BTC Automatic Publication Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan. Steps use checkbox syntax for tracking.

**Goal:** 用户不需要逐篇审核；授权来源经过 AI 评分、证据核验后自动公开、精选、归组和生成日报。

**Architecture:** 复用现有分析流水线、请求回执、版本指纹与统一公开 projection，增加小型纯决策模块与持久化核验任务。人工模式保持兼容，自动模式只对逐源批准来源放行；未核验的稿件及衍生文案不公开。

**Tech Stack:** Node 24 TypeScript、PostgreSQL 17、pg-boss、Zod、React Router；测试使用本机 HTTP stub 和独立 PG17 测试库，模型/采集默认关闭。

**Approved spec:** `docs/superpowers/specs/2026-09-30-9btc-automatic-publication-design.md`；用户已于 2026-10-01 回复“按方案实施”，无需再次批准本计划。

## Task 1: 评分范围与核验契约

Files: create `packages/backend/src/editorial/automatic-policy.ts`, `industry/prompts/verify-summary.md`, `tests/automatic-policy.test.ts`; modify `editorial/analyze.ts`, `editorial/models.ts`, `config.ts` and `.env.example`.

- [x] 写失败测试并运行 `node --test tests/automatic-policy.test.ts`：高分不能弥补伪造引文/缺证；两分跨门槛或差值>20 需第三次；全部分数≥门槛且极差≤20 才精选；人工模式仍两次平均分决定；不足次数不放行。
- [x] 实现 `EDITORIAL_MODE=manual|automatic`（错误值拒绝，默认 manual）；增加核验 capability。
- [x] 核验结构包含 verdict、风险标志、完整主张清单及每条材料 ID/摘录；材料和文案不可发出指令。纯函数验证全部核心主张 supported、材料 ID 存在、非空引文在已抓材料内、中文文案非空、数字/时间/阶段一致的模型检查通过；关键二手事实必须取得一手材料支持。模型自报置信分不直接放行。
- [x] 自动模式最多第三次评分，保留原五轴/门槛与人工模式；存 score range 和提示词版本。最小值/最大值明确不是统计置信区间。
- [x] 验证纯策略/评分相关测试与 typecheck；先 spec review，再质量 review，修正后记录提交。

## Task 2: 持久化核验、自动授权与事件一致性

Files: create incremental migration `0043_automatic_verification.sql` and `editorial/automatic-verification.ts`; modify `editorial/analyze.ts`, `auto-publication.ts`, `review.ts`, `jobs/content.ts`, `jobs/queue.ts`, `publication/publish.ts`, `events/eligibility.ts`, `events/group.ts`, `events/merge.ts`, necessary event read/digest paths. Tests: `tests/automatic-verification.test.ts`, `tests/automatic-publication.test.ts` and existing editorial/events tests.

- [x] PG17 失败用例验证：相关性 UNKNOWN、未批准源、正文失败、缺失核验、伪造引文、过期 revision、错误中文金额均不公开；完整材料+独立核验可自动公开/精选且不需人工决定。
- [x] 新核验轮次按 article revision+rule version 唯一，analysis 绑定不得重置同轮次数；保存原文/文案 hash、输入版本、receipt IDs、材料快照、阶段/次数/状态、决定理由；不可在重启后重置已消耗次数。并发分析/核验使用唯一轮次 claim；陈旧 claim 有限恢复，已保存回执可复用。禁止锁内等待模型。
- [x] 分析完成排队核验，核验使用项目 chatJson/paidRequest（usage/预算）。仅取得 verified 记录才调用纯策略并给当前指纹自动放行。补抓最多2个原文内 HTTPS 一手链接，遵守 fetch/extract 防 SSRF/大小/超时，最多1次补抓复核和1次重写复核，合计最多3次核验；终止状态不能由普通 sweep 重置。
- [x] 外链不是首批采集来源新增；只从文章实际链接中选取批准的一手域名，绝不请求模型虚构 URL。摘要重写结果需重新核验并绑定最终输出。错误继续使用现有有限队列重试与回执复用；每轮 attemptTag/identity 含 policy、analysis、round。
- [x] 自动授权沿用 auto_public 与 curation 状态，但必须有当前 verified 授权；未核验的旧狭窄 auto_public 不变成精选。管理员主动禁发/撤稿优先，自动模式不依赖人工审核流程。
- [x] 归组/合并后在现有锁下复查并重新应用有效自动精选；值/文案授权不因纯成员关系变动永久失效。显式去重恢复，队列重试最多2次。原文/文案/规则变动使旧核验失效。自动精选沿用精选可索引规则。
- [x] 自动模式事件公开文案只用已核验条目 title/summary；生成的 story digest 未经独立核验不公开，首版允许直接回退已核验条目，避免引入额外模型步骤。检查所有网站/API/MCP事件 DTO，不只页面。
- [x] 完成 PG17集成与既有人工回归；spec review → quality review →提交。

## Task 3: 自动日报和无人值守运行

Files: modify `reports/editorial.ts`, `publication/reports.ts`, `apps/worker/src/schedules.ts`; create `reports/automatic.ts` if separation improves clarity; tests `tests/automatic-report.test.ts`, existing report-editorial tests. Optional minimal ops settings stats within existing backend/admin routes.

- [x] 失败用例：只有自动精选且核验当前者进入日报；无人点击生成/发布；空候选跳过；过期草稿不能发布；重复任务/重启不重复发同一期；已撤稿引文不泄露。
- [x] 复用候选快照、report_drafts/version和统一published_reports；新增自动专用入口以 actor=automatic-policy 留痕，不伪装管理员。汇总现有核验摘要，不生成额外新闻结论/导语。
- [x] 配置 `AUTOMATIC_DAILY_TIME=21:30`，验证 HH:mm，仅 automatic 模式注册日程，Asia/Shanghai，missed once、队列有限重试。事务复查一次不匹配时重新生成一次；无候选不创建公开空刊，窗口接续上期真实截止。周/月不启用。
- [x] 公开报告引用同时接受当前核验自动精选与已有人工模式；源/稿撤销继续标不可用，索引和详情均不泄露未核验摘要。
- [x] 留存自动决定原因、评分分歧/缺证/失败/用量，可由后台现有来源/运行查看；异常的暂停与调用上限使用现有预算/来源禁用开关，禁止自动改写生产规则。提供版本化回归测试。
- [x] PG17 日报和人工回归；spec review → quality review →提交。

## Task 4: 验证、文案与 EU 部署

Files: update `industry/site.ts` / public method text and affected admin labels only where it falsely requires manual review; update `docs/deploy-9btc-eu.md`, `docs/model-9btc-pilot.md`, approved spec/plan status. Do not edit privacy pages.

- [x] 扫描页面文案，消除“每天等待人工审核”的错误承诺；说明 AI 评分与证据核验、原文链接、误差改进，不声称概率已校准。
- [x] `npm run typecheck`; 空 PG17 `_test` 库 `node scripts/migrate.ts && node scripts/seed.ts --topics-only && npm test`; Web build+16 tests；本机stub流程；git diff/check/secret hygiene。固定提交的 Docker smoke 另在下项 CI/私有部署验收。
- [x] 全体最终 review。选择性提交并推送到既有 `feat/9btc-web3` 和 PR1，完整 CI pass 后固定提交部署到EU；部署前本机备份，保留其他服务。
- [x] 没有真实模型凭据时部署代码可以完成，但 COLLECT/MODEL 调用和公共 Caddy保持关闭，不把 stub 通过称为真实新闻上线。独立测试库使用合成材料验证完整自动公开→事件→日报，不向业务库写合成新闻。
- [x] 模型资源已提供：百炼目录和 Flash/Max 两次隔离真实调用成功，见 docs/model-9btc-pilot.md。已安全送EU并配置共同调用预算；真实内容最终验收见下项，不再询问供应商或模型选择。
- [x] 最后启用已批准六源的独立自动策略和 `EDITORIAL_MODE=automatic`，验证12–18真实样本质量与费用；合格内容、自动日报和公开出口真实通过后开启9btc.com Caddy，完整业务状态验证。

## Completion boundary

代码和私有部署完成不代表正式上线。真实模型接口缺失时继续完成所有独立工作，仅在需要用户提供模型资源处交回。用户日常不需要人工筛选或发布；模型配置是基础设施接入，不是内容审核。

## Implementation evidence

Task 1 completed at `ee75e04`: pure policy/preset 17 tests, scoring local-stub 7 integration tests, full typecheck and whitespace check passed; independent spec and quality reviews approved after fixing missing-evidence verdict classification. Task 2 is complete locally: isolated PG17 38/38 final analysis/verification regressions passed, prior publication/source/manual regressions passed, evidence pure tests 10/10 and full typecheck passed. Independent spec and quality reviews approved after fixing normal-job replay identity, actual automatic group retries and compound/token currency parsing. Production and real-content acceptance remain pending. Bailian connectivity evidence is isolated synthetic integration, not public news or production acceptance.

Task 3 completed locally after independent spec and quality approval: PG17 automatic/manual report, queue and source regressions 15/15; final automatic report 5/5 including original source dates, no-date/history exclusion, warm-cache stale title redaction, and pause persisted during an in-flight prefilter. Three pure configuration/schedule/safety tests and full typecheck passed. Both review findings were reproduced RED before fixes. Public deployment and real-news acceptance are still pending.

Task 4 in progress: real-pilot prompt defects were reproduced and corrected without lowering gates; dedicated rewrite receipt/version, runtime daily metadata and RSS tests each passed RED to GREEN. Full typecheck, Web build and 16 Web tests passed. A fresh PG17 run passed 274/275; the remaining test reproduced the static schedule inconsistency being corrected. Independent quality/integration review also reproduced three lifecycle regressions RED: obsolete accepted rules still exposed through item detail; restart lacked ordinary current-rule reanalysis; structured event dates were not independently verified. These fixes, their final reviews, full regression and fixed-version production acceptance remain required. EU/naban first scheduled backup/pull both succeeded with matching SHA-256, recorded in `docs/backup-ops-server.md`.

Final local/isolated validation: fresh PostgreSQL 17 database `ninebtc_automatic_acceptance2_test`, 41 migrations and topics-only seed, passed **282/282 backend tests** (191.7 s). Full typecheck passed after the final changes. The old-rule/public-exit, ordinary restart recovery, canonical ledger payload/release time, structured occurrence date and terminal deterministic contradiction cases are fixed; release-time and contradiction-pause regressions were reproduced RED before repair. Spec, quality and final integration reviewers approved. Three full-suite fixture defects were corrected without changing production grouping or weakening publication authority: global release watermark timing, SQL metadata projection inspection and accidental random-text lexical collision. No synthetic news was written to the business database. Fixed-commit CI, EU deployment and real-public-content acceptance remain pending.

`5db0a39` subsequently passed complete check/Docker CI and EU private API/web smoke with 41 migrations. Real worker startup exposed pg-boss's immutable queue-policy contract: even resubmitting the existing policy to `updateQueue` fails. The follow-up changes only mutable queue update options, preserves old queues/jobs and keeps singleton creation for new queues. Real PG17 upgrade and repeat-registration regression plus realistic pure registration tests passed **3/3** after reproducing the same error RED; full typecheck and all three reviews approved. No new paid requests were sent by the failed startup. Follow-up fixed-commit CI/restart and genuine public-content acceptance are pending.

`260c718` passed complete fixed-commit [CI](https://github.com/ihao/AIHOT/actions/runs/36811170670), including **284/284 backend tests**, typecheck, Web build/tests and Docker smoke. EU backup preceded upgrade; worker v3 genuinely started and sent model requests. Private 30-route smoke and actual password/session/CSRF acceptance passed. Cron persists `30 21 * * *` in `Asia/Shanghai`. One real Coin Metrics item initially passed current verification and entered the all feed without selection; remaining real-input acceptance is in progress. A separate restore of the actual naban-pulled snapshot `20261001T034642Z` recovered 41 migrations, six sources, 18 real articles, 87 request attempts and 15 verification rounds, without touching production. Public Caddy remains closed at this checkpoint.

Real-pilot follow-up: spaced Chinese currency amounts such as `5938 亿美元` were misparsed as zero. A minimal coefficient/scale whitespace correction retains currency/unit/amount conflicts and literal-quote checks. `currency-amounts-v2` is explicitly included in the rule fingerprint; ordinary sweep invalidates prior grants and preserves old terminal histories. Pure tests passed 30/30, full typecheck passed, and a **fresh** PG17 `ninebtc_amount_upgrade_20261001_test` passed 59/59 targeted policy/evidence/verification tests. Reusing an earlier test database first encountered that database's future ledger watermark; the mandated fresh database passed without changing the production ledger gate. SEC title-only amounts remain unsupported by its current body material. Spec and quality reviews approved; fixed-commit CI/upgrade/public acceptance continue.

Production acceptance complete at code commit `5f5af62`: complete CI **286/286 backend** plus Web16/build/typecheck/Docker; private and real HTTPS smoke30 each. Real initial samples13 analyzed (including2 relevance blocks), fiveawaiting shared budget; current verified public4, automatically selected2. All18 business inputs genuine. Public detail/Markdown/licence/source dates/rejected404/API/RSS/MCP/selected snapshot verified; stopped-worker reader attempts120→120. Caddy backup/validation/reload and actual validated certificates/root/www redirects succeeded. EU, naban and local direct paths succeed; local proxied browser closes the connection, so proxied visual acceptance is explicitly unverified. One regular worker started; allsix scheduled fetches succeeded, total235 real articles, budgets unchanged. Daily21:30 scheduled; current real window empty and correctly unpublished, not a claimed early daily. Historical backfill is not forced into today's events. Actual naban launch-snapshot restore recovered41 migrations/6 sources/235 articles/120 attempts/4 public/2 selected/4 current grants. Final evidence: `docs/research/2026-10-01-live-acceptance.json`; deployment, model and backup records updated. No further user decision is required for normal running.
