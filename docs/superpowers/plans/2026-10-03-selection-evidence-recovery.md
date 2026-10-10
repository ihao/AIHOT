# 精选取证与纠错优化 Implementation Plan

> **For agentic workers:** REQUIRED: Use subagent-driven-development to implement this plan. Steps use checkbox syntax for tracking.

**Goal:** 修复高分候选的取证与有限纠错路径，保持事实核验和费用边界，完成生产验证。

**Architecture:** 在 editorial 下分离 evidence-materials 和 verification-recovery 的纯逻辑；既有 automatic-verification 持久化控制器调用这些模块。继续使用一套公开授权读层与精确版本兼容。

**Tech Stack:** Node 24+ TypeScript、PostgreSQL、node:test、固定版本 unpdf、React Router。

## Task 1: 取证和有界纠错引擎

Files: 新建 packages/backend/src/editorial/evidence-materials.ts、packages/backend/src/editorial/verification-recovery.ts 和必要 PDF 解析单元；修改 industry/evidence.ts、industry/automatic-rule-compatibility.ts、automatic-policy.ts、automatic-verification.ts、两份核验/重写提示词、package manifests 与 lockfile；如需持久化 rewrite 模型身份则增加编号0047的向后兼容迁移；tests/automatic-evidence.test.ts、automatic-policy.test.ts、automatic-verification.test.ts 及新的 pure tests。

- [x] 写失败测试：财政部域名与伪造域名拒绝；相关公告优先于背景公告；Arbitrum user_id=7、username=Arbitrum、category_id=52、第一帖/topic ID，普通用户/回复/不符拒绝；生成小 PDF、超限/不可读拒绝。
- [x] 运行 `node --test tests/automatic-evidence.test.ts` 及新纯测试，保存失败证据。
- [x] 实现 bounded fetch 和文字提取，重新导出现有函数以保留测试/调用兼容；unpdf 固定 1.8.1，解析资源上限和独立执行单元，处理异常返回 null。
- [x] 增加逐条 primary 与服务器 quoteId 测试；旧 bool 调用默认整篇严格，实际控制器显式使用新逐条模式。未提供 per-claim riskFlags 时保留严格 fallback，关键事实由确定性规则要求一手证据。
- [x] 新段落引用以 raw/whitespace-normalized 连续子串绑定 materialId；未知 quoteId 拒绝，legacy exactQuote 不放松。
- [x] 增加 no-new-primary/needs_evidence 的唯一 rewrite 集成失败测试，金额/日期/核心事件保护与 <=3 verification 付费尝试不变。按 receipt_attempts 保证 rewrite 最多一次付费尝试，固定模型/配置；覆盖 malformed/unknown/crash-before-save/model-change，可恢复成功缓存而不能另付费重试。
- [x] 重写和再次 verifier 输入都包含 immutable original_copy 和原文标题，检查主体、动作和阶段未改变；缺 coreEventPreserved 字段不得接受重写稿。对抗样本包括改主体/动作/阶段、删除中心事件与 generic placeholder。
- [x] 实现状态转换，持久化取证诊断在已有 decisions 条目的额外字段，保持 verifier/decision 结构可读；无新增 schema 若可行。
- [x] 规则纳入取证/claim/recovery版本；补扫只处理48h新鲜内容，优先 selected/score，批量20。审核新旧实际 hash，精确兼容旧未重写严格 accepted；旧 rewritten 仅文案未变或四元组（article_id/旧规则/original_copy_hash/final_copy_hash）匹配独立复查证明名单时兼容，SQL及runtime同一保护，其余按正常路径重新核验。名单仅生产已逐条复查的10组变化文案（另1条文案未变），排除改变TPS执行范围的Sui稿件。测试每种当前状态均覆盖旧授权，修改指纹或未知文章不得兼容，不兼容 rejected 结果；记录旧重写授权影响。
- [x] 运行针对性 tests、类型检查，完成 spec review 后再 code quality review；固定提交只包含本任务文件。

## Task 2: 后台唯一文章漏斗与诊断

Files: packages/backend/src/admin/runs.ts、apps/web/app/routes/admin/runs.tsx（以实际路由文件为准）、tests 中对应后台统计/呈现测试。

- [x] 写失败测试：一个文章旧拒绝+新接受只能计一次；来源暂停/版本失效不得计为公开；真实引用错误与取证原因分开；读统计不创建新任务。
- [x] 运行测试确认失败。
- [x] 保留历史 round 统计，另加当前文章漏斗及当前版本原因；引用公开读层实际条件。高分候选持续4小时无精选时显示异常待检查，仅后台提示，不发送消息。
- [x] 针对性测试与 frontend tests 通过；完成 spec review 和 code quality review，固定提交。

## Task 3: 完整验收、发布和真实候选核对

- [x] 新建 /private/tmp 独立 PG 测试集群与 *_test 空库，采集和推送安全阀关闭，模型测试仅允许本机 mock 且无真实凭据，迁移后完整 `npm test`、`npm run typecheck`、`npm run build -w @aihot/web`、`node --test apps/web/tests/*.test.ts`。
- [x] 本地启动 API/Web，运行 `node scripts/smoke.ts --base http://127.0.0.1:<隔离端口>`，结束后停止本次服务与集群。
- [x] 核对固定提交与干净任务文件，保留其他工作区修改；将任务提交整合回主 checkout。
- [x] 生产只读 baseline：镜像、实际 release commit、规则、公开/精选 ID、来源开关、预算和十篇候选；生成备份并保存回退镜像。
- [x] 部署固定提交独立 release 目录，复用现有私有环境文件，不输出密钥；执行容器内离线规则/库验证后只更新 API/Web/Worker，不执行新的来源种子。
- [x] 通过 normal sweep/recovery 路径核对十篇真实候选，无手工授权、不重置历史/费用/原文日期。记录恢复/修稿/重复/过期/继续拒绝/预算等待。
- [x] 验证生产网站/API/RSS/MCP真实条目，暂停来源和已有有效公开授权保持正确，预算设置不变；保存非秘密验证 JSON 与简明交付报告，清理临时进程。

## 完成记录

2026-10-04 已完成三项任务及规格、质量、整体复查。发布代码56650d8；后端367/367、前端18/18、生产断网镜像29/29、本地与生产HTTP检查通过。目标十篇候选五篇恢复精选、两篇继续拒绝、三篇过期；来源/费用/评分设置保留。交付证据见[生产验收记录](../../research/2026-10-04-selection-evidence-recovery.md)。
