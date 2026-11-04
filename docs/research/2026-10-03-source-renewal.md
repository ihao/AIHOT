# 生产信源整顿与补充：2026-10-03

已在生产完成：审查原 81 个启用源，暂停 16 个长期无有效近期输入的配置入口，新增 10 个经过生产网络实测的媒体来源。最终 **75 个启用、29 个暂停，共保留 104 个配置**。上限按站长最新澄清执行：**最多 100 个启用源，暂停源不计入**。PANews 保持启用。

新源均显式设置首次回溯最多 1 个月、首次最多 3 条；自动入库和模型执行仍只允许最近 48 小时、未来不超过 1 小时且原始日期有效的稿件。现有公开/精选门槛、独立证据核验、付费回执与模型预算保持原设置。公开与分发全文均关闭，只发布经核验的摘要和原文链接。

## 审查依据与暂停决策

基线生产快照为北京时间 2026-10-03 02:19。原启用源均无连续采集失败，但 20 个入口已无 30 天内可确认的新稿。逐入口强制只读重抓后，暂停其中 16 个；保留 Bitcoin Core、Monero、IPFS、Lightning Labs 四个低频软件发布/安全更新入口。近期只有几天到数周无更新的机构、研究和治理源继续保留，观察窗口不足时不据此判定失效。

判定关注当前入口的可信日期、可读正文与近期输入。HTTP 200、健康状态 ok、导入的历史公开存量均不能单独证明持续新产出。Circle 当前列表无可信日期，samczsun 当前列表大部分无日期，Filecoin 中文 RSS 与 DFINITY Medium 等当前端点明显陈旧；本次保留配置和历史，暂停这些入口等待重新评估。

| 暂停入口 | 最近存档原文日期 | 生产重抓结果 |
|---|---|---|
| Circle Blog（circle-blog） | 2026-04-08 | 列表无有效日期 |
| Electric Coin Company / Zcash（electric-coin） | 2025-12-04 | 12 条候选，30 天内有效稿 0 |
| Filecoin Blog（filecoin-blog） | 2026-01-16 | 258 条候选，30 天内有效稿 0 |
| Flashbots Writings（flashbots-writings） | 2026-08-09 | 68 条候选，30 天内有效稿 0 |
| DFINITY / Internet Computer Review（icp-blog） | 2025-11-03 | 10 条候选，30 天内有效稿 0 |
| Immunefi（immunefi） | 2026-05-21 | 15 条候选，30 天内有效稿 0 |
| Matt Corallo / BlueMatt（kol-bluematt） | 2026-03-09 | 17 条候选，30 天内有效稿 0 |
| Dankrad Feist（kol-dankrad） | 2026-05-31 | 10 条候选，30 天内有效稿 0 |
| Peter Todd（kol-peter-todd） | 2026-08-07 | 10 条候选，30 天内有效稿 0 |
| samczsun（kol-samczsun） | 2025-12-10 | 11 条候选，30 天内有效稿 0 |
| OtterSec（ottersec） | 2026-07-14 | 36 条候选，30 天内有效稿 0 |
| Paxos Blog（paxos-blog） | 2026-06-01 | 3 条候选，30 天内有效稿 0 |
| Phantom（phantom） | 2026-07-17 | 66 条候选，30 天内有效稿 0 |
| Render Network 官方 Medium（render-blog） | 2026-07-17 | 10 条候选，30 天内有效稿 0 |
| Starknet Blog（starknet-blog） | 2026-08-07 | 21 条候选，30 天内有效稿 0 |
| Wormhole Blog（wormhole-blog） | 2026-08-07 | 12 条候选，30 天内有效稿 0 |

所有暂停通过现有信源管理接口实施，带版本检查、锁和审计；生产任务复查显示已暂停源待执行任务为 0。原始资料、配置、回执与核验记录保留。

## 新增来源与过滤

第一批六源已验证官方 RSS、近 48 小时稿件及可读正文；第二批使用文章/主题分类和标题过滤，降低短快讯、推广、价格预测、泛 AI 和股票稿的输入。

| 新增源 | 入口/策略 | 生产探测与边界 |
|---|---|---|
| CoinDesk News | [官方 RSS](https://www.coindesk.com/arc/outboundfeeds/rss/)；订阅正文/文章详情及主题过滤 | 探测 24 条近 48 小时稿，初始正文样本可读 |
| Cointelegraph News | [官方 RSS](https://cointelegraph.com/rss)；订阅正文/文章详情及主题过滤 | 探测 30 条近 48 小时稿，初始正文样本可读 |
| Decrypt News | [官方 RSS](https://decrypt.co/feed)；订阅正文/文章详情及主题过滤 | 探测 29 条近 48 小时稿，初始正文样本可读 |
| Odaily 星球日报文章 | [官方 RSS](https://rss.odaily.news/rss/post)；订阅正文/文章详情及主题过滤 | 探测 4 条近 48 小时稿，初始正文样本可读；description 实为全文，summaryIsBody=true |
| BlockTempo 動區動趨 | [官方 RSS](https://www.blocktempo.com/feed/)；订阅正文/文章详情及主题过滤 | 探测 10 条近 48 小时稿，初始正文样本可读；页面多组发布时间有时区矛盾，保留官方 RSS 时间 |
| Bitcoin Magazine News | [官方 RSS](https://bitcoinmagazine.com/feed)；订阅正文/文章详情及主题过滤 | 探测 10 条近 48 小时稿，初始正文样本可读 |
| ChainCatcher 链捕手文章 | [官方 RSS](https://www.chaincatcher.com/rss/clist)；文章类别，排除活动推广 | 最终过滤后 15 条近 48 小时稿；RSS 已有可读全文 |
| TechFlow 深潮 Web3 文章 | [官方 RSS](https://www.techflowpost.com/rss/v2/feed.xml?lang=zh-CN&type=article&topic=web3&tag=all)；Web3 文章入口，排除活动推广 | 最终过滤后 11 条近 48 小时稿；RSS 已有可读全文 |
| Protos Crypto News | [官方 RSS](https://protos.com/feed/)；Crypto 类别，排除 AI/图表 | 最终过滤后 5 条近 48 小时稿；RSS 已有可读全文 |
| BeInCrypto News | [官方 RSS](https://beincrypto.com/feed/)；排除股票/泛AI/交易分析 | 最终过滤后 7 条近 48 小时稿；RSS 已有可读全文；详情页 403，样本直接使用 RSS 已确认正文 |

十源全部为 T2、第三方媒体、editorial，正常采集间隔 60 分钟（生产已有自适应频率机制）。自动发布权限逐源通过现有审计接口授予，仍需文章独立核验通过；转载与引用报告不会因来自新媒体而自动获得第一手或精选资格。

CoinDesk 样本详情 datePublished 与 RSS 一致，即使链接路径日期更早也使用实际原文元数据核对。Cointelegraph 等媒体引用的旧报告仍由现有证据新鲜度规则检查。TechFlow/ChainCatcher 的活动宣传最初因通用主题豁免而通过过滤，最终配置移除该豁免，生产创建前再次验证，分别保留 11/15 条近期文章。

未接入：Blockworks RSS 最新停在 2026-01-07；BlockBeats 两代端点 200 但无条目；CryptoSlate/ Coinbase 生产 RSS 403；The Block 详情受限；The Defiant 样本标记付费；DL News 官方订阅有商业使用限制；Foresight 未找到可用官方 RSS；Kraken 近期稿在去掉上币和抽奖宣传后没有合适内容。更多候选证据见[候选调研](2026-10-03-source-candidates.md)。

## 生产验收与证据边界

- 截至北京时间 2026-10-03 02:37:46，10 个新源全部采集成功，首次各入库 3 条，共 30 条；一个月以前、48 小时以前和无日期稿件均为 0。
- 最终生产启用数 75 <= 100，暂停数 29，总配置数 104。用户澄清上限前首批凭证保留当时实际操作原文；第二批按启用数检查，最终验收使用启用数。
- 公网实际验收：新增源目前有 2 条通过核验的公开内容，全部在公开列表、HTML 详情页和详情 API 可见；分别为 Blast 关闭及 Cboe VIX 永续期货报道。模型预算当时为每分钟 20 / 每小时 300 / 每天 2000 次，已用小时 84 / 日 425，没有重置或提高预算。
- 新源采集/正文可用已实测，长期公开产出效率仍需正常运行积累样本。部分稿件核验拒绝，部分任务因每分钟预算等待重试；这两种状态分别记录，不计为公开成功。具体公开数量与公网可见性见 public-acceptance.json。
- 生产标准备份成功，变更均为数据库信源管理操作；应用采集、评分和核验代码未改动，无新应用镜像部署。开发源目录同步为 104/75/29，种子仍只添加缺失 ID，避免覆盖后台设置。
- 类型检查、前端构建通过，前端测试 16/16、信源/管理/时效针对性测试 20/20；生产站点 30 项页面/API/RSS/MCP 检查通过。
- 完整后端测试采用独立空库与外部 HTTP 阻断，310/311 通过；既存 tests/automatic-verification.test.ts:601 手动事件日期断言仍失败，本次没有更改该代码。初始模型安全阀关闭导致模型模拟路径失败，离线模拟服务条件下复验后剩上述一项，未将完整测试标为通过。

## 原 81 个启用源逐源表

公开存量使用当前公开授权条件统计，包含历史档案；近 48 小时稿只计有可靠原文时间的存档，不等同核验通过。费用列为历史实际模型/服务尝试数，观察窗口短，不能据此预测长期性价比。完整计数见 audit-81.json。

| ID | 名称 | 近48h稿 | 公开存量 | 实际调用 | 决策 |
|---|---|---:|---:|---:|---|
| a16z-crypto | a16z crypto | 0 | 24 | 172 | 保留 |
| aave-blog | Aave Labs Blog | 0 | 48 | 358 | 保留 |
| aave-gov | Aave 治理论坛 | 4 | 27 | 229 | 保留 |
| arbitrum-blog | Arbitrum Blog | 0 | 15 | 90 | 保留 |
| arbitrum-gov | Arbitrum 治理论坛 | 5 | 24 | 221 | 保留 |
| balancer-gov | Balancer Forum | 0 | 21 | 188 | 保留 |
| bis | BIS / BCBS / CPMI | 2 | 6 | 50 | 保留 |
| bitcoin-core-releases | Bitcoin Core 版本说明 | 0 | 60 | 385 | 保留低频版本入口 |
| bitcoin-delving | Delving Bitcoin | 2 | 25 | 203 | 保留 |
| bitcoin-optech | Bitcoin Optech | 1 | 9 | 72 | 保留 |
| blockstream-blog | Blockstream Blog | 0 | 14 | 91 | 保留 |
| bnb-blog | BNB Chain Blog | 0 | 10 | 71 | 保留 |
| celestia-blog | Celestia Blog | 1 | 15 | 98 | 保留 |
| chainalysis | Chainalysis 研究与安全 | 2 | 10 | 88 | 保留 |
| chainlink-blog | Chainlink Blog | 0 | 6 | 64 | 保留 |
| circle-blog | Circle Blog | 0 | 3 | 19 | 暂停当前入口 |
| coin-metrics | Coin Metrics State of the Network | 0 | 18 | 131 | 保留 |
| compound-gov | Compound Community Forum | 4 | 29 | 218 | 保留 |
| consensys | Consensys | 0 | 24 | 221 | 保留 |
| eigenlabs-blog | Eigen Labs / EigenLayer Blog | 0 | 9 | 95 | 保留 |
| electric-coin | Electric Coin Company / Zcash | 0 | 2 | 18 | 暂停当前入口 |
| ens-blog | ENS Blog | 0 | 8 | 62 | 保留 |
| ethereum-foundation | Ethereum Foundation Blog | 1 | 59 | 392 | 保留 |
| ethereum-magicians | Ethereum Magicians EIP/ERC 讨论论坛 | 1 | 26 | 197 | 保留 |
| ethereum-research | Ethereum Research | 1 | 30 | 189 | 保留 |
| filecoin-blog | Filecoin Blog | 0 | 57 | 366 | 暂停当前入口 |
| fincen | 美国 FinCEN | 1 | 3 | 26 | 保留 |
| flashbots-forum | Flashbots Collective | 0 | 17 | 147 | 保留 |
| flashbots-writings | Flashbots Writings | 0 | 60 | 377 | 暂停当前入口 |
| fsb | Financial Stability Board | 0 | 2 | 32 | 保留 |
| galaxy | Galaxy Research | 5 | 14 | 377 | 保留 |
| geth-release | Geth Releases | 0 | 10 | 62 | 保留 |
| glassnode | Glassnode Research | 0 | 15 | 95 | 保留 |
| icp-blog | DFINITY / Internet Computer Review | 0 | 7 | 61 | 暂停当前入口 |
| immunefi | Immunefi | 0 | 13 | 92 | 暂停当前入口 |
| ipfs | IPFS Blog & News | 0 | 24 | 168 | 保留低频版本入口 |
| kol-bluematt | Matt Corallo / BlueMatt | 0 | 17 | 102 | 暂停当前入口 |
| kol-christine-kim | Christine D. Kim | 2 | 11 | 146 | 保留 |
| kol-dankrad | Dankrad Feist | 0 | 9 | 62 | 暂停当前入口 |
| kol-lopp | Jameson Lopp | 0 | 8 | 86 | 保留 |
| kol-molly-white | Molly White | 0 | 4 | 98 | 保留 |
| kol-peter-todd | Peter Todd | 0 | 10 | 63 | 暂停当前入口 |
| kol-samczsun | samczsun | 0 | 8 | 87 | 暂停当前入口 |
| layerzero-blog | LayerZero Blog | 0 | 12 | 104 | 保留 |
| lido-gov | Lido Governance | 2 | 29 | 198 | 保留 |
| lightning-labs | Lightning Labs Blog | 0 | 10 | 64 | 保留低频版本入口 |
| metamask-news | MetaMask News | 0 | 39 | 334 | 保留 |
| monero | Monero Project | 0 | 20 | 120 | 保留低频版本入口 |
| morpho-blog | Morpho Blog | 0 | 12 | 97 | 保留 |
| nansen | Nansen | 0 | 4 | 41 | 保留 |
| ondo-blog | Ondo Finance Blog | 0 | 12 | 74 | 保留 |
| openzeppelin | OpenZeppelin | 0 | 9 | 68 | 保留 |
| optimism-blog | Optimism Blog | 0 | 55 | 373 | 保留 |
| optimism-gov | Optimism Collective 治理论坛 | 0 | 23 | 182 | 保留 |
| ottersec | OtterSec | 0 | 29 | 194 | 暂停当前入口 |
| panews-articles-zh | PANews 中文文章 | 24 | 1 | 474 | 保留 |
| paradigm | Paradigm | 0 | 52 | 341 | 保留 |
| paxos-blog | Paxos Blog | 0 | 1 | 20 | 暂停当前入口 |
| pendle-blog | Pendle 官方 Medium | 0 | 8 | 57 | 保留 |
| phantom | Phantom | 0 | 51 | 353 | 暂停当前入口 |
| polkadot-forum | Polkadot Forum | 2 | 17 | 201 | 保留 |
| polygon-blog | Polygon Blog | 0 | 12 | 86 | 保留 |
| pyth-blog | Pyth Network Blog | 1 | 6 | 71 | 保留 |
| quicknode-blog | QuickNode Blog | 2 | 49 | 373 | 保留 |
| render-blog | Render Network 官方 Medium | 0 | 4 | 47 | 暂停当前入口 |
| reth-release | Reth Releases | 0 | 9 | 61 | 保留 |
| rocketpool-gov | Rocket Pool Governance | 0 | 29 | 183 | 保留 |
| safe | Safe | 2 | 7 | 44 | 保留 |
| sec-press-releases | SEC 新闻稿 | 3 | 6 | 81 | 保留 |
| sky-gov | Sky 治理论坛 | 4 | 31 | 213 | 保留 |
| slowmist | SlowMist / 慢雾 | 0 | 5 | 55 | 保留 |
| solana-news | Solana 官方新闻 | 1 | 18 | 129 | 保留 |
| starknet-blog | Starknet Blog | 0 | 16 | 127 | 暂停当前入口 |
| stellar-blog | Stellar Development Foundation Blog | 0 | 10 | 63 | 保留 |
| sui-blog | Sui Blog | 1 | 52 | 377 | 保留 |
| tether-news | Tether News | 0 | 4 | 31 | 保留 |
| uniswap-blog | Uniswap Labs Blog | 1 | 16 | 118 | 保留 |
| uniswap-gov | Uniswap 治理论坛 | 0 | 27 | 185 | 保留 |
| walletconnect | WalletConnect | 0 | 5 | 38 | 保留 |
| wormhole-blog | Wormhole Blog | 0 | 12 | 84 | 暂停当前入口 |
| zama | Zama | 1 | 7 | 45 | 保留 |

## 可复核材料

- [81源指标与决策](2026-10-03-source-renewal/audit-81.json)
- [最终计划与精确配置](2026-10-03-source-renewal/plan.json)
- [首批生产审计凭证](2026-10-03-source-renewal/production-receipt.json) / [第二批凭证](2026-10-03-source-renewal/production-second-receipt.json)
- [生产计数、采集、入库日期与核验状态](2026-10-03-source-renewal/production-verification.json)
- [公网实际公开可见性](2026-10-03-source-renewal/public-acceptance.json)
- 同目录保留强制重抓、原始候选与过滤后探测 JSON，不保存抓取全文或凭据。
