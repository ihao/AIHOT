# 预测市场媒体信源调研与生产接入

2026-10-03，北京时间 22:48 接入，22:54 复核。用户授权调研预测市场方向的主流媒体并直接添加 3–5 个信源；沿用此前确认的激活信源不超过 100 个、不得处理一个月以前历史数据的限制。

## 实际问题与结果

接入前生产有 104 个配置，其中 75 个激活、29 个暂停。预测市场标签下实际有 5 篇有效公开稿，精选为 0。专题页面读取精选集合，所以显示为空；不能把主题页空白理解成全部动态没有任何相关稿件。

本次新增 5 个媒体信源，均已启用并通过有审计记录的管理接口授予按现有规则自动核验的资格。生产现在为 **109 个配置、80 个激活、29 个暂停**。这五个来源均不是项目官方一手来源，分级为 T2；不开站内全文或全文 RSS。

首次采集五源全部成功，入库 5 篇：CNBC 1 篇、iGaming Business 2 篇、Casino.org 2 篇。所有稿件都有可靠原文时间，且入库时在 48 小时以内；一个月以前、48 小时以前、无日期和异常未来日期稿件均为 0。

新增 CNBC 稿已完成正文提取、分析、核验与公开投影，公网全部动态 API、详情 API 和 HTML 均返回 200 并可见。预测市场公开稿从 5 增至 **6 篇**，精选仍为 **0 篇**。新增源接入已完成，不能把 5 篇入库材料表述为 5 篇公开或精选。

## 选中的五个来源

| 来源 | 角色及覆盖 | 官方采集入口 | 实测结果 |
|---|---|---|---|
| [CNBC](https://www.cnbc.com/2026/10/03/novig-credits-sydney-sweeney-backed-campaign-for-platforms-surge-in-growth.html) | 综合财经媒体；平台经营、融资、用户增长与金融市场发展 | `https://www.cnbc.com/id/100003114/device/rss/rss.html` | 30 条综合稿经主题过滤保留 1 条；原文日期有效，免费详情正文 3277 字符，新增公开 1 篇 |
| [Front Office Sports](https://frontofficesports.com/tag/prediction-markets/) | 体育商业媒体；预测市场商业合作、融资、监管与做市机制 | `https://frontofficesports.com/tag/prediction-markets/feed/` | 50 条标签稿；最新稿 9 月 30 日，RSS 含可读正文；首次按 48 小时规则跳过旧稿，等待新稿 |
| [Sportico](https://www.sportico.com/t/prediction-markets/) | 体育商业媒体；联邦与州监管争议、诉讼及平台合规分析 | `https://www.sportico.com/t/prediction-markets/feed/` | 9 条标签稿；最新稿 9 月 26 日，实测详情正文 4297–9444 字符；首次跳过旧稿，等待新稿 |
| [iGaming Business](https://igamingbusiness.com/sports-betting/prediction-market-roundup-10226/) | 博彩行业媒体补充；事件合约规则、欧洲监管、行业参与方和商业发展 | `https://igamingbusiness.com/tag/prediction-markets/feed/` | 100 条标签稿，近 48 小时 2 条；RSS 正文 3991/4376 字符；首次入库 2 篇 |
| [Casino.org News](https://www.casino.org/news/tag/prediction-markets/) | 博彩行业新闻补充；平台监管、结算规则、市场诚信与责任交易 | `https://www.casino.org/news/tag/prediction-markets/feed/` | 40 条标签稿，近 48 小时 2 条；RSS 正文 3567/3709 字符；首次入库 2 篇 |

前三个提供综合财经或体育商业视角，后两个提供预测市场相关的行业监管报道；不把后二者称为综合财经媒体。FOS 的媒体定位可查[官方介绍](https://frontofficesports.com/about/)，Sportico 的归属可查 [Penske Media 官方介绍](https://www.pmc.com/our-story)。媒体报道的诉讼、提案和监管判断仍须逐稿核验，不能直接当成最终法律结论。

## 入口与内容筛选

- 四个来源采用预测市场专用标签 RSS，保留原文时间和链接，排除优惠码、拉新奖金、下注推荐等标题。
- CNBC 使用综合 RSS，在入库前只保留标题或摘要含 Polymarket、Kalshi、prediction market / prediction-market、event contract、Novig 的稿。使用现有 `ingestNoiseFilter`：`dropMarkers: [""]` 默认过滤全部稿，`keepIfMatches` 按上述词保留。标签仍由内容分析识别，不把整个媒体所有稿件强行标注为预测市场。
- 所有新源显式配置 `_aihot.initialBackfillMonths: 1`、`initialBackfillLimit: 3`、`sortByPublishedAt: true`、`fetchPublicContent: true`，采集间隔为 60 分钟。
- 月份上限与更严格的自动 48 小时窗口同时生效；每次自动任务执行再次检查时效。没有用历史文章填充新主题。
- 均为 `T2`、`editorial`、`first_party=false`；`site_fulltext=false`、`syndicate_fulltext=false`。保持现有评分、证据核验、精选和预算设置。
- 创建前逐个检查 ID、采集地址重复和支持的配置键；现有 CoinDesk、Cointelegraph、Decrypt 等源没有重复接入或重新配置。

## 未选入口与理由

| 候选 | 当前实测限制 |
|---|---|
| Fortune 预测市场/Polymarket/crypto RSS | 三个测试入口均返回 404，未把猜测的 RSS 地址接入 |
| Blockworks | `blockworks.co/feed` 重定向到 `blockworks.com/feed`；订阅最新时间停在 2026-01-07，相关详情返回 403，无法作为当前有效入口 |
| Gambling Insider | 测试 RSS 返回 403；有近期报道，但采集入口尚不可用 |
| Axios | 综合 RSS 可读，但本轮 100 条无预测市场匹配；主题入口与稳定产出尚未证明 |
| The Defiant | RSS 可解析，但近期样本详情正文只有 511 字符，其他样本返回 403；完整正文稳定性弱于入选源 |
| Finance Magnates | 标签 RSS 返回 404；综合详情提取样本混入大量页面内容，当前入口不足以证明干净的预测市场采集 |
| Legal Sports Report | RSS 与正文可用，近期相关稿在 9 月 30 日；与本次已选体育商业及行业媒体覆盖重叠，作为备用 |
| Sports Illustrated 预测市场栏目 | [栏目](https://www.si.com/prediction-markets)包含大量优惠码、平台推荐和赔率内容，本次不作为主题新闻源接入 |

以上结论只评价本次测试的入口与当前可接入性，不评价机构整体信誉，也不代表媒体永远无法接入。

## 稿件处理与剩余边界

截至 22:54：

- CNBC 稿核验接受，已在[全部动态的预测市场列表](https://9btc.com/all?tag=%E9%A2%84%E6%B5%8B%E5%B8%82%E5%9C%BA)和[详情页](https://9btc.com/items/ntr4ecbj4rqisel4rv8fpcllz)公开；评分 18，不是精选。
- iGaming Business 两稿均完成分析，但核验拒绝：一稿没有新增一手证据；另一稿缺少关键主张的一手证据，并有金额一致性问题。保留原拒绝状态，没有人工改为公开。
- Casino.org 两稿正文已入库，分析触及 `dashscope` 每分钟预算，保留自动重试状态；不能把等待称为采集失败或核验接受。实际重试时间和错误在验收 JSON 中。
- FOS、Sportico 首次采集成功且没有近期符合窗口的稿，入库数为 0。它们补充后续平台与诉讼报道，当前尚不能证明接入后的公开产出。
- 新源不保证即时形成精选；主题页仍为 0 条精选，评分和证据门槛未调整。

## 验证、恢复与材料

类型检查、网页构建通过；网页回归 16/16、完整后端回归 318/318、公网标准检查 30/30。首次网页测试受沙箱本机端口限制，允许本机端口后通过。首次后端测试关闭了模型路径，导致要求本机模型替身的用例失败；在另一个全新空测试库、虚假凭据及外部 HTTP 阻断条件下开启替身路径，完整回归通过。没有更改用例或业务逻辑。

本机回归为 Node 26.3.0 / PostgreSQL 14.20；生产采集和处理实测为 Node 24.21.0 / PostgreSQL 17。此次只有有审计的信源数据库操作，没有部署新的应用镜像。源目录与文档已同步，种子只增加缺失 ID，原工作区其他信源调整保留。

写入前启动一致性数据库备份，完成后确认 `/srv/9btc-release-backups/before-prediction-sources-20261003.dump` 非空、54,793,473 字节、权限 600。如需撤回本次接入，应通过管理接口暂停这五个新增 ID，保留原配置、档案和费用账本；不要用整库恢复覆盖后续正常工作。

证据保存在 [prediction-market-sources 目录](2026-10-03-prediction-market-sources/)：

- `plan.json`：精确配置、激活上限及历史限制。
- `feed-probe.json`、`targeted-probe.json`：生产解析器下的 RSS、日期、正文字符数和过滤结果；不保存全文或凭据。
- `production-baseline.json`、`production-receipt.json`、`production-verification.json`：生产基线、创建/授权/采集审计与最终状态。
- `public-acceptance.json`：公网列表、详情 API、HTML 和专题 API 的实际检查。
- `checks.json`：测试与生产验证范围。
