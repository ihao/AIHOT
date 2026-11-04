# 9BTC 上游升级与生产发布实施计划

目标：按用户 2026-11-04 已批准的升级评估，将已同步的 origin/main cd424b0 增量整合到 9BTC，保留 D01–D06，并完成真实生产发布。用户已授权实施、必要提交推送及生产发布，无需重复审批。

架构：沿用 web/API/worker 分层及统一 publication。保留行业包、站点模块、CNY/供应商保护、价格证据、48 小时时效、PASS-only 和不补历史报告；新增付费策略默认不启用，通用修复跟随上游。使用独立 worktree 和 PostgreSQL 17，仅本地假服务可访问模型路径。

## 执行步骤

- [x] 核实远程 main、业务分支和生产，保存不含凭据的版本/配置证据；运行合并前基线。
- [x] 正常双父 merge origin/main；逐处解决品牌、Web3 提示词/分类、BTC 首次报价、预测市场参数与现有测试冲突。
- [x] 适配 providers/llm.ts、embeddings.ts、receipts.ts、operations/recover.ts、admin/models.ts：保留原 CNY 预留/结算及共享凭据熔断，未知计费不自动放行；新增 fallback 不默认启用。
- [x] 适配 editorial/analyze.ts、jobs/content.ts、publication/items.ts 及自动合并接点，验证 PASS-only、publicFloor=10、人工 null/0 覆盖、旧分析不重购、过期修订不继承候选。
- [x] 保留 reports/compose.ts 的 automaticKinds/catchUpHistory=false；保留 site/migrations.ts hook 和不可变历史迁移依据；EU worker 停止宽限跟随新版 515 秒。
- [x] 对新增 card 去重/反馈判噪采用本站明确的默认关闭策略，避免更新引入新付费步骤；在现有配置/入口上进行最窄适配，并写行为回归。使用已有测试先复现丢失的保护，再实施最小修复。
- [x] 运行 typecheck、全部后端/模块与网页回归、生产构建、迁移安全、新安装/73 项基线升级/二次空迁移、真实来源日期/正文样本比较、本地页面/API/RSS/Agent/MCP 和浏览器验收。
- [x] 独立 Spec 及代码质量审查，处理阻断项。固定合并提交并推送业务分支，不修改上游 main、不 squash/强推。
- [x] 在 EU 构建固定提交镜像，用生产备份恢复独立 _test 库，关闭采集/模型/推送并阻断外部模型访问，实际执行新版迁移和保全检查。核实 Node 满足 >=24.22.1。
- [x] 发布：保存可回滚镜像/Compose 与 env 哈希；正常停止旧 worker，备份并实际恢复验证；核对原文/修订/分析/回执/账本/报告/来源/settings/BTC 绑定与公开/精选集合，完成迁移后启动新版 API/web，核验出口后恢复 worker。
- [x] 核实公网烟测、MCP、浏览器、worker 心跳与实际任务，记录迁移/镜像/备份和观测结果；同步长期决策与验收记录，清理本次临时实例但保留回滚证据。

验收边界：模拟合并不等于测试通过；旧回归数量不复用为新证据；本地 Node 26 与生产 Node 24 运行区分记录。若新上游行为会改变历史公开内容或新增付费调用，必须保留现状/最窄兼容，不能静默放宽规则或重跑历史。

执行完成。应用提交7a03ab1已上线；详细结果见2026-11-04-upstream-release.md与机器可读verification.json。GitHub CI和物理设备/微信验收未被本地或仿真结果替代。
