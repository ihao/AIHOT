# main 更新与 9BTC 生产 feature 分支差异分析

核查日期：2026-10-09（北京时间）；生产快照：17:23。分析对象是 Git 固定提交与当前运行容器，不把本地未提交材料视为已部署代码。

## 结论

本地 `main` 已从 `885b736` 快进到远程 `origin/main` 的 `cf1c464`，同步了 **80 个上游提交**。当前工作区仍在 `feat/9btc-web3`，其提交仍为 `2c7412c`；原有 4 个已跟踪文件的修改保持原样。此次没有合并到 feature、推送或变更生产。

这次上游更新包含引擎和公开接口 3.x/4.0、站点配置拆分、模块机制、采集与回执修复、公开读取优化及网页重构。9BTC 则有独立的事实核验、发布授权、金额预算、自动日报和 BTC 行情链路。两边已经明显分叉，不能把 main 当作生产分支的直接替代品。

对两个固定提交进行不触碰工作区的合并模拟，得到 **113 个冲突文件**。更重要的是，还有 Git 无法发现的数据库和行为冲突：上游删除价格元数据会破坏 9BTC 预算查询；替换发布器会丢失 9BTC 的独立核验授权；替换排程会清除未重新注册的站点任务。

## 1. 同步结果与生产基线

| 对象 | 固定版本 / 状态 | 说明 |
|---|---|---|
| 原本地 main | `885b736dc0fd3ef3d4c9c70af2bc3a981a99ff38` | 两条分支的共同祖先 |
| 新本地 main / origin/main | `cf1c4643993a1fc9bcdd523fc4018a9024258418` | 已核对双方 ahead/behind 均为 0 |
| 本地 feat/9btc-web3 | `2c7412c0c679f8f979f9416371131ef63ba2125c` | 仍比 origin/feat/9btc-web3 多 2 个提交 |
| 生产 API、worker | `ninebtc-btc-usd:ad33c4b` | 两个容器均运行中，镜像 ID 一致 |
| 生产 web | `ninebtc-prediction-filter:12c9509` | 运行中，包含预测市场筛选修复 |
| 生产数据库 | 47 个已执行迁移 | 含自动审核、模型预算、核验执行和 BTC 快照迁移 |

生产不是整套服务共用同一提交：API/worker 保持 BTC 行情版本，web 后续单独更新。`ad33c4b..2c7412c` 的差异只有网页筛选、对应 taxonomy 和验收文档；后端运行源码没有新的差异。`12c9509..2c7412c` 只有两份验收文档，因此本地 feature 的网页源码与当前生产网页一致。

生产容器声明 `EDITORIAL_MODE=automatic`、`AUTOMATIC_DAILY_TIME=21:30`，采集和模型阀均为 `true`。金额策略记录存在，CNY 当日及滚动窗口额度均为 9 元，但 **enabled=false**；这不代表金额上限正在生产强制执行，也不代表请求次数预算或供应商容量控制失效。

生产容器标签指向 `/srv/9btc-releases/btc-usd-ad33c4b/deploy`，网页还叠加 prediction-filter 的镜像覆盖文件。另一个旧目录 `/srv/9btc` 的 Git HEAD 是 `df7e45e`，不能用它代表正在运行的版本。当前发布目录没有可解析的 Git 仓库；版本核对依据运行镜像标签、镜像 ID 和本地发布记录，未逐文件比对容器内源码。

## 2. 差异规模

| 比较方式 | 结果 |
|---|---|
| 共同祖先 → 新 main | 80 个提交；666 文件；新增 36,677 行、删除 22,660 行 |
| 共同祖先 → feature | 139 个提交；342 文件；新增 32,444 行、删除 2,071 行 |
| 新 main ↔ feature 的最终文件差异 | 880 文件；按 main → feature 方向新增 54,351 行、删除 37,995 行 |
| 两边都改过的路径 | 127 个 |
| 合并模拟冲突路径 | 113 个 |

提交数包含文档、测试和合并提交，不等于新增功能数。文件差异包含移动、删除及新增测试，不等于 880 个业务模块。合并冲突数是 Git 自动合并结果，不包含自动合并成功但语义不兼容的文件。

## 3. 上游更新与 9BTC 的具体差异

| 范围 | 新 main 的行为 | 当前生产 feature 的行为 | 对 9BTC 的影响 |
|---|---|---|---|
| 站点与行业配置 | 品牌、站点文案、模型预设、条款、公用文件移入仓库内部 `site/`；`industry/` 保留行业知识 | 9BTC 品牌、条款、更新日志仍在 `industry/`，模型预设由后端管理 | 要按新目录迁移 9BTC 配置，不能恢复 AI 示例品牌与信源 |
| 模块扩展 | 新增 `modules/` 和 `site/modules/` 注册；默认模块清单为空 | 行情、核验、预算等修改直接接入引擎 | 行情适合逐步模块化；事实授权与付费预占仍需引擎层接入 |
| 内容分析 | 正文待提取时先等待；两次独立评分的均分达到分级门槛即可成为候选 | 自动模式有评分一致性要求；跨门槛或分差超过 20 追加评分，并独立核验主张 | 可以吸收正文等待修复，但必须保留自动评分与核验要求 |
| 公开授权 | 从来源权限、分析、人工覆盖及归组结果生成公开投影，没有 9BTC 审核授权链 | 绑定来源政策、内容指纹、规则版本和 accepted 核验；修改后失效；自动模式只公开授权摘要 | 不能以 main 的 publication 实现覆盖 9BTC 门禁 |
| 精选与机器出口 | 新增 `grouping_status`、`selection_candidate`、`seat`；归组确认带来新信息才入选；同一事实的机器出口保留代表报道 | 在独立核验与来源门槛后授予精选，读取层同时复查审核与策展授权 | 值得吸收去重，但会改变精选数量、RSS、同步 remove 与日报候选，需单独验收 |
| 事件与撤回 | 事件综述依据当前有效报道；关联桥接证据撤回后隐藏不足证据的 related；更正和公开缓存更一致 | 9BTC 事件、热点还检查有效策展/核验授权 | 两种约束应叠加；不能把上游有效证据等同于 9BTC accepted 授权 |
| 日报 | 按事件规则编排，默认 08:00；已评判但没有大事可发平静日；周/月从日报汇编 | 北京时间 21:30，事务复查有效精选及指纹；无候选跳过，窗口从上期实际截止时间续接；周/月关闭 | 是产品规则差异。不能只修改时间就认为等价 |
| 模型与回执 | 具名模型移入 `site/models.ts`，明确 vision/reasoning 配置；归组、向量和翻译结果与回执完成原子提交 | 有共享 CNY 预占/结算、价格快照、评测独立额度、供应商容量暂停、受保护核验路由 | 原子回执修复可吸收；金额/容量/评测隔离及路由必须保留 |
| 采集与日期 | 首次导入后限制存档继续进入；无可信日期先不公开；统一信源时区；Atom/JSON/隐藏 HTML/原生视频/X 空正文修复 | 有自动处理新鲜度和真实日期约束，以及 Web3 原文与证据策略 | 大量修复有价值，但需与既有 freshness、核验输入、采集政策一起验证 |
| BTC 行情 | 没有 Coinbase BTC-USD 采集、API、不可变新闻价格绑定与卡片 | 每 5 分钟采集；首次入库绑定有效报价，历史缺失不伪造 | 采集入口、schema、contracts、读取层和网页均须迁移保留 |
| 预测市场 | 示例 taxonomy 为 AI；新版筛选只生成全部、一手、分类选项，仍支持已有 tag 链接 | Web3 taxonomy；`FEED_TOPIC_TAGS` 将预测市场加入桌面/移动入口，空精选可转相关全部动态 | 新网页重构不能覆盖最近已发布的主题入口和参数行为 |
| 网页 | 手机导航、底栏、抽屉、下拉刷新、搜索、阅读工具、字体设置、视频播放、后台表格滚动更新 | 原有 9BTC 页面与行情组件 | 可以吸收，但必须保留行情、主题筛选、摘要权限及 API 契约 |
| 公开接口 | OpenAPI/MCP 4.0.0；新增 Agent Markdown 路由；周/月 schema 和 availability 响应改变 | 基于较旧框架，带 9BTC 审核与行情扩展 | 前后端需成套适配；不适合直接让新版 web 配旧 API |
| 移除功能 | 模型榜、Codex 监控、主题大事记从框架移除，并删除对应数据与队列 | 9BTC 已关闭模型榜和 Codex 监控，旧代码/表仍存在 | 导航通常不受影响，但清理迁移有破坏性，需备份并核对依赖 |

代表性上游提交：`8d5a39b`（恢复/公开一致性/Agent）、`5794327`（规则日报与手机重构）、`1ca5d6d`（4.0 引擎与功能移除）、`d5d9645`（site/modules 拆分）、`50b562b`（采集日期与模型额度）、`ec42ff7`（更正撤回一致性）、`1d48ec1`（读取与召回开销）、`9229843`（归组回执原子提交）、`47d50dd`（正文前置等待）、`d6105c1`（桥接撤回）、`ff23271` / `cf1c464`（阅读与桌面入口）。完整 80 条见证据 JSON。

## 4. 必须先处理的兼容问题

### 4.1 价格列删除会破坏当前金额预算链路

main 的 `database/migrations/0051_drop_unused_state.sql` 删除 `service_prices.note`、`verified_on`、`per_request`、`source_url`。生产这四列当前都存在。

feature 的 `packages/backend/src/providers/model-cost.ts:66` 中 `readPrice()` 明确 SELECT `per_request,verified_on,source_url`；`reserveModelCost()` 在可靠 token 上界存在时，即使金额强制策略关闭，也会读价格保存计价快照。因此保留 9BTC 预算代码却原样执行该迁移，会遇到列不存在的 SQL 错误。它是已由源码和当前 schema 确认的兼容冲突，尚未在数据库执行复现。

应保留这些仍有用途的字段或先迁移价格证据的存储与所有读取方。上游关于“无人读取”的假设不适用于 9BTC，不能通过停用预算绕过。

### 4.2 迁移编号相同不表示迁移相同

共同祖先有 35 个迁移；main 有 58 个，feature 与生产有 47 个。生产尚未执行 main 的 **23 个新增迁移**；feature 自己新增 12 个。

例如 `0039_oss_recovery.sql` 与 `0039_editorial_review.sql`、`0043_publication_seat.sql` 与 `0043_automatic_verification.sql`、`0050_drop_lb_rankings_unused_columns.sql` 与 `0050_btc_usd_quotes.sql` 编号相同，但文件名和作用不同。迁移账本按完整文件名匹配，编号相同不会自动跳过，也不是当前的文件名碰撞。

合并时需要保留 9BTC 已执行的历史文件及账本，再逐项评估上游的新增 schema、数据修复和删除。main 从 `0055` 起要求单条在线语句，支持并发索引和超时检查；已有历史迁移仍可能有删除操作，不能把新在线规则当作全部历史均向后兼容的保证。

### 4.3 删表删列与旧代码不能并行运行

main 的 `0045_drop_topics.sql` 删除 topics；9BTC 的 seed 仍调用 `seedTopics()`。`0051` 删除 `stories.status`，feature 的 `events/digest.ts:83` 仍通过 `refreshStoryStatuses()` 更新它。上游也删除 `regroup_pending`、`stored_files`、`story_digests.context_article_ids` 等状态，`0053` 删除榜单、监控及 fx_rates。

不应在现有 API/worker 仍运行时直接执行这些迁移。上游更新手册也要求备份、构建、停止旧 API/worker/web、迁移，再启动。回滚应用镜像不能自动恢复被删列或被删数据；必须预先确认旧镜像与目标 schema 的兼容性。

### 4.4 新 worker 会清除未登记的站点任务

main 的 `apps/worker/src/schedules.ts` 将引擎与模块日程合并，然后删除所有不在现行清单中的 `cron.*` 队列。9BTC 的 `reports.daily-automatic`、`reports.daily-catchup`、`automatic.safety`、`events.sweep`、`market.btc-usd` 并不在 main 的默认引擎清单中。

移植时必须在清理逻辑运行前登记这些仍在使用的日程/模块任务，否则可能丢失排程和排队工作；不能只保留功能文件而忘记任务注册。

### 4.5 模块机制不是现成的独立核验门禁

上游 ServerModule 提供 HTTP、模型步骤、日程、队列、通知和变更事件等入口。现有 `EngineHooks` 的 `articleChanged` 是发布变化事件，没有直接替代 9BTC publicationAuthorityCondition 的统一授权接口，也没有替代 paidRequest 内金额预占的接口。

可以先把行情、运维页面及独立日程整理为模块，但不能声称只注册一个模块就能完整保留全部公开出口的审核门禁与付费预算。必须在发布生成、公开读取、日报事务和付费请求边界明确接入并验证。

### 4.6 提示词和规则指纹影响已公开内容连续性

9BTC 的 `AUTOMATIC_RULE_VERSION` 包含证据策略、评分、写作和结构提示词等哈希；兼容表只接受明确审核过的历史版本和不可变文案证明。main 改了 structure、group、story-digest 和报告提示词，并移除了旧日报导语提示词。

直接复制新提示词可能改变授权规则指纹，旧 accepted 记录不能因此自动继承新授权；它既可能导致已有内容关闭，也可能在错误兼容处理下放行不合格内容。要先计算受影响规则与公开集合，再采用有限且审计过的兼容方案，不能通配旧版本。

### 4.7 工作区存在未提交的信源扩展

`industry/sources.json` 在 feature 提交中只有 6 个种子源，当前未提交文件有 109 个配置源；main 有 18 个 AI 示例源。这个差异属于工作区，不应把 109 当成已提交的 feature 配置，也不能据此断言生产启用数是 109。

其余原有修改为 `docs/deploy-9btc-eu.md`、`docs/sources.md` 和 `scripts/seed.ts`，另有未跟踪研究材料。此次均保留，报告比较中的功能判断以固定 Git 提交为主。

## 5. 建议的吸收顺序

1. **先保住生产语义。** 以 feature 为业务基线，登记当前核验、来源政策、公开/精选 ID、日报窗口、请求次数预算、金额策略与行情绑定；单独规划 schema 冲突。
2. **先吸收通用正确性修复。** 正文前置等待、归组/翻译/向量回执原子提交、采集日期解析与隐藏内容修复、撤回一致性、会话校验、查询索引与召回缓存修复。逐项接入 9BTC 授权和费用保护，不能整文件覆盖。
3. **再整合 site/modules 与接口契约。** 迁移 9BTC 品牌、模型、条款、公用文件；将适合的站点功能模块化，明确核验/预算仍需要的引擎接入。API、contracts、web 成套升级。
4. **最后决定产品行为。** 新精选代表席位、归组增量价值、规则日报/平静日、周/月和新移动界面，要与 9BTC 现行规则逐项确定；沿用 21:30、摘要许可与预测市场入口。

长期方向建议跟进新 main 的引擎结构，保留 9BTC 的业务扩展；短期可从 feature 上逐项移植依赖清楚的修复。直接一次合并所有冲突再“能构建就上线”不足以保证授权、预算和公开内容连续性。

## 6. 验证范围与证据

本次已完成：Git fetch、main 快进与相等检查、固定提交日志/文件差异、无工作区合并模拟、生产容器及数据库只读核查、关键路径源码分析、原有已跟踪修改逐字节核对。

没有修改运行代码或数据库，因此没有重跑应用测试或执行迁移；没有验证新版 main 在 9BTC 数据库上的完整运行、浏览器表现和生产兼容性。合并模拟是风险证据，不是整合已经完成的证明。

- [Git 提交、路径、迁移和变更统计](2026-10-09-main-feature-comparison/git-comparison.json)
- [当前生产版本、迁移和非敏感预算配置](2026-10-09-main-feature-comparison/production-snapshot.json)
- [113 个模拟合并冲突文件](2026-10-09-main-feature-comparison/merge-conflicts.txt)

复核命令（仓库根目录）：

```sh
git rev-list --left-right --count main...origin/main
git merge-base main feat/9btc-web3
git rev-list --left-right --count main...feat/9btc-web3
git log --oneline 885b736..main
git diff --shortstat main..feat/9btc-web3
git show main:database/migrations/0051_drop_unused_state.sql
git show feat/9btc-web3:packages/backend/src/providers/model-cost.ts
```
