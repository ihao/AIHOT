# Web3 官方协议、开发社区与项目原始信源调研

核查日期：2026 年 10 月 1 日（北京时间）。用途：为 9BTC 提供候选信源库，尚未修改线上配置。清单共 **82 个采集入口**，其中包含同一项目的博客、论坛、状态页等不同入口，不能把入口数当作独立组织数。

## 判断标准

优先纳入协议标准与代码的原始发布渠道、主要公链与 DeFi 项目的开发和治理入口、稳定币发行方及 RWA 产品方、关键预言机和跨链基础设施、各主要应用领域的代表性一手渠道。这里的影响力是按行业结构覆盖、机制重要性和一手证据价值作出的研究判断，没有用未核实粉丝数、TVL 排名或市值排名证明“顶级”。本清单不宣称穷尽所有 Web3 项目。

P0：建议先审议的核心信息入口；P1：第二批补全赛道覆盖；P2：按专题或事件调用，部分为技术背景、低更新频率或商业教程源。优先级是候选接入顺序，不是对项目安全、投资价值或作者观点的认可。

**权威必须限定到具体事项。** 一个项目最适合证明自己发布了什么，未必适合证明同行好坏、真实采用程度和资产风险。Bitcoin 没有统一官方发言人；Optech 是专业编辑来源，Delving Bitcoin 是开发社区，BIPs 是提案库。Ethereum Foundation、ACD 记录、ethresear.ch 与 EIPs 也各有不同权限与证据价值。

## 核验范围与采集边界

逐个通过原站网页、公开仓库或官网直接外链核查。agent-reach 的 Exa 后端连接失败后，使用 web 原站读取作为回退。没有读取登录态 X、Telegram 群聊或 Discord；没有以搜索片段推断社交账号真实性。表中入口类型来自观察到的页面结构；仅见 RSS 链接时标记“可见 RSS 链接”，不猜 feed URL，也不声称 feed 可解析。

页面可读只能证明当前工具取得了内容。页面核查与 feed 探测分开记录。根调研另在本机用 HTTP 和 feedparser 实测了部分 RSS/XML，结果如下；**仍未验收 API、分页、正文抽取、限流、增量去重、版权授权、稳定运行与生产入库。** Base、ZKsync、Ethena、Pendle Medium、Render Medium、DFINITY Medium 的文章级采集尤其需进一步验收。JSON 的 `feedTested` 仅表示尝试过本机 feed 探测；必须同时查看 `feedProbes.result`，true 本身不代表成功。

治理消息必须至少分成：讨论/温度检查 → 正式提案 → 投票通过 → 排队/延时 → 执行交易 → 生效参数或代码。论坛“approved”文案也应追到投票与链上结果。GitHub 提案合并、EIP Final、开发会议计划均不能直接写成“主网上线”。

## 分赛道清单

### Bitcoin 与 Ethereum 技术（8 个入口）

|优先级|来源与原始入口|主要价值|权威边界|采集入口|
|---|---|---|---|---|
|P0|[Bitcoin Core 发布与安全公告](https://bitcoincore.org/en/releases/)|直接跟踪主流比特币客户端发布与安全修复|客户端项目发布不代表全体节点接受某个协议变更|release-list / RSS-link-observed|
|P0|[Bitcoin Improvement Proposals](https://github.com/bitcoin/bips)|协议提案原稿、状态和修改历史|收录或编号不等于形成共识、合并实现或激活|github-repository|
|P1|[Delving Bitcoin](https://delvingbitcoin.org/)|开发者的协议设计、安全与实现讨论|开放技术社区；发帖者观点不代表 Bitcoin 官方决策|discourse-forum|
|P0|[Bitcoin Optech](https://bitcoinops.org/)|高密度追踪 Bitcoin 与 Lightning 技术变更并链接原讨论|独立专业技术编辑团队；属于二次整理，不是 Bitcoin 官方|newsletter / RSS-link-observed|
|P0|[Ethereum Foundation Blog](https://blog.ethereum.org/)|基金会研发、升级、安全与资助公告|基金会声明不等于全体 Ethereum 社区或客户端共识|official-blog|
|P0|[Ethereum Research](https://ethresear.ch/)|扩容、共识、密码学与经济机制的前沿讨论|开放研究提案；须识别作者与成熟度，未必进入路线图|discourse-forum|
|P0|[Ethereum Improvement Proposals](https://eips.ethereum.org/)|核心协议与 ERC 标准原文和状态|Draft、Review、Final 各有含义；Final 也不是全部客户端部署证据|specification-index|
|P0|[Ethereum All Core Devs 议程与记录](https://github.com/ethereum/pm)|开发协调会议、议程、会议记录与升级讨论|会议讨论和目标日期不等于实际主网激活|github-repository|

### L1、L2 与模块化网络（23 个入口）

|优先级|来源与原始入口|主要价值|权威边界|采集入口|
|---|---|---|---|---|
|P0|[Solana 官方新闻](https://solana.com/news)|网络升级、开发与应用生态的一手公告|生态宣传和性能数据需核对测量方法；不自动代表所有生态项目|official-news-list|
|P0|[Solana Status](https://status.solana.com/)|故障、维护与恢复时间线|运营方报告；不能单靠绿色状态证明所有用户 RPC 正常|status-page / RSS-Atom-links-observed|
|P0|[Optimism Blog](https://optimism.io/blog)|OP Stack、升级、互操作与企业部署动态|基金会和公司内容带商业立场；需区分 Mainnet 与其他 OP 链|official-blog|
|P1|[Optimism Collective 治理论坛](https://gov.optimism.io/)|治理提案、预算、升级和资助讨论|论坛讨论、投票通过与链上执行是不同状态|discourse-forum|
|P0|[Arbitrum Blog](https://blog.arbitrum.io/)|Arbitrum 技术、网络与生态公告|基金会、开发商与 DAO 权限须分别识别|official-blog|
|P1|[Arbitrum 治理论坛](https://forum.arbitrum.foundation/)|DAO 预算、委托人、生态与升级提案|社区作者不等于基金会；提案不等于资金拨付或升级执行|discourse-forum|
|P0|[Base Blog](https://blog.base.org/)|Base 网络与产品动向|官方运营者的网络公告；不可将宣传直接当作采用数据|official-blog / dynamic-page|
|P1|[Starknet Blog](https://www.starknet.io/blog/)|ZK 扩容、Cairo、网络升级与研发|生态文章与技术结论应区分；路线图不等于上线|official-blog|
|P1|[ZKsync 官方 Paragraph](https://paragraph.com/@zksync)|ZK Stack、ZKsync 与协议升级动向|项目观点带生态利益；动态页面需另测正文采集|paragraph-publication / dynamic-page|
|P1|[Polygon Blog](https://polygon.technology/blog)|Polygon 升级、Agglayer 与支付稳定币生态|不同产品网络不可混称；合作声明需核实上线状态|official-blog|
|P1|[Avalanche Builder Hub Blog](https://docs.avax.network/blog)|ACP、验证者规则、AvalancheGo 与网络升级|Ava Labs DevRel 解释不替代代码、ACP 状态和链上激活|developer-blog|
|P1|[Aptos 官方 Currents](https://aptosnetwork.com/currents)|Move、网络、支付、开发与生态公告|页面混有 Press 外部报道；采集需保留原始作者和出处|official-news-list|
|P1|[Sui Blog](https://www.sui.io/blog)|Move、网络发布、安全、应用与 Sui Stack|基金会与开发商内容有生态立场；测试指标不等于生产指标|official-blog|
|P1|[BNB Chain Blog](https://www.bnbchain.org/en/blog)|BNB Chain 网络、开发与生态公告|与 Binance 交易所公告分开；公链宣传不证明资产风险可控|official-blog|
|P1|[Cosmos Blog](https://cosmos.network/blog)|Cosmos SDK、IBC、网络与生态研究|Cosmos 官网不能代表每条 Cosmos 链的治理决定|official-blog|
|P1|[Celestia Blog](https://blog.celestia.org/)|数据可用性、模块化、网络升级与性能研究|性能宣称需核对环境；DA 项目不等于所有 rollup 的安全保证|official-blog|
|P2|[Polkadot Forum](https://forum.polkadot.network/)|Polkadot 技术与生态讨论入口|社区论坛；帖子不等于 OpenGov 公投或执行记录|discourse-forum|
|P1|[NEAR Blog](https://www.near.org/blog)|链抽象、账户、协议与 AI 应用动态|商业和基金会叙述需与网络技术文档相互核对|official-blog|
|P2|[TON 开发者文档](https://docs.ton.org/)|TON 协议、开发、节点与应用技术参考|静态文档偏背景；不作为高频新闻流，也不等于 Telegram 全部产品信息|developer-documentation|
|P2|[Berachain Blog](https://blog.berachain.com/)|Proof of Liquidity、网络与治理公告|当前列表最新可见条目在 2025 年；活跃性须重新评估|official-blog|
|P2|[Monad Documentation](https://docs.monad.xyz/)|EVM 执行、节点、网络与开发机制参考|偏技术背景源；发布新闻另需发现并验收入口|developer-documentation|
|P1|[Ripple Insights](https://ripple.com/insights/)|支付、XRP Ledger 相关产品、RLUSD 与机构应用|Ripple 公司观点不能代表 XRP Ledger 全部社区或治理|company-blog|
|P2|[Cardano Foundation Blog](https://cardanofoundation.org/blog)|Cardano 采用、研究、治理和基金会活动|基金会是生态组织之一；不可将其等同所有协议开发方或治理主体|foundation-blog|

### DeFi 与流动性质押（15 个入口）

|优先级|来源与原始入口|主要价值|权威边界|采集入口|
|---|---|---|---|---|
|P0|[Aave 治理论坛](https://governance.aave.com/)|借贷参数、抵押品、风险评估、部署与 GHO 讨论|TEMP CHECK、ARFC、AIP 与执行不同；风险服务商声明也需署名|discourse-forum|
|P1|[Aave Labs Blog](https://aave.com/blog)|协议架构、发布、产品和应用研究|Labs 产品与 DAO 治理不同；自述安全结果需对应审计报告|official-blog|
|P0|[Uniswap 治理论坛](https://gov.uniswap.org/)|费率、跨链部署、治理与资金提案|RFC、Temperature Check 不等于投票通过或已执行|discourse-forum|
|P1|[Uniswap Labs Blog](https://blog.uniswap.org/)|AMM、Hooks、UniswapX、钱包与技术研究|Labs、Foundation、协议 DAO 须分开；前端上线不等于协议变更|official-blog|
|P0|[Sky 治理论坛](https://forum.skyeco.com/)|稳定币治理、风险参数、抵押品与 RWA 讨论|论坛提案需关联 Executive Vote 与实际链上执行|discourse-forum|
|P1|[Curve Governance](https://gov.curve.finance/)|稳定币流动性、crvUSD、治理与激励|论坛建议、Gauge 投票与实际资金影响需分别验证|discourse-forum|
|P1|[Compound Community Forum](https://www.comp.xyz/)|借贷市场、风险参数和治理提案|开放社区；需跟踪提案编号、投票状态和执行交易|discourse-forum|
|P0|[Lido Governance](https://research.lido.fi/)|流动性质押、节点运营、安全和协议治理|服务商、贡献者、DAO 权限不同；讨论不是协议执行|discourse-forum|
|P1|[Morpho Blog](https://morpho.org/blog/)|借贷机制、金库、风险隔离与机构集成|金库风险取决于策展人和配置；协议方宣传不替代逐库尽调|official-blog|
|P1|[Pendle 官方 Medium](https://medium.com/pendle)|收益拆分、PT/YT、利率交易与 Boros 动态|由官网直接链接；产品机制解释不是固定收益承诺|medium-publication|
|P1|[Hyperliquid Docs](https://hyperliquid.gitbook.io/hyperliquid-docs)|永续、订单簿、HyperCore 与 HyperEVM 原始机制|性能与透明度为项目自述；交易风险需验证链上与 API 数据|developer-documentation|
|P1|[Jupiter Developer Blog](https://developers.jup.ag/blog)|Solana 聚合路由、报价、执行与 API 更新|技术博客覆盖开发产品；不能代替所有 Jupiter DAO 或代币公告|developer-blog|
|P2|[dYdX Blog](https://www.dydx.xyz/blog)|去中心化衍生品、产品与交易基础设施|推广活动噪声较多；原 Labs、链和新产品权责应按文章区分|official-blog|
|P2|[Balancer Forum](https://forum.balancer.fi/)|AMM、激励、风险与 DAO 讨论|开放提案，须确认投票和执行；安全事件需对照技术事后报告|discourse-forum|
|P2|[Rocket Pool Governance](https://dao.rocketpool.net/)|去中心化节点质押、协议升级与治理|协议 DAO 与 oracle DAO 角色须区分；帖子不等于 RPIP 已实施|discourse-forum|

### 稳定币与 RWA（7 个入口）

|优先级|来源与原始入口|主要价值|权威边界|采集入口|
|---|---|---|---|---|
|P0|[Circle Blog](https://www.circle.com/blog)|USDC、EURC、CCTP、支付与产品支持变更|发行人一手声明有商业立场；储备、赎回与监管结论另核验原始文件|official-blog|
|P0|[Tether News](https://tether.io/news/)|USDT、跨链发行、冻结和公司公告|发行人公告不替代储备鉴证、监管文件或独立风险结论|official-news-list|
|P1|[Paxos Blog](https://www.paxos.com/blog)|PYUSD、USDG、USDP、PAXG 与发行基础设施|监管表述需原监管文件；博客不等于审计意见|official-blog|
|P1|[Ethena Blog](https://ethena.fi/blog)|USDe、USDtb、对冲机制、网络与产品公告|合成美元风险不能类比现金储备稳定币；需透明度和托管对冲数据|official-blog / dynamic-page|
|P0|[Ondo Finance Blog](https://ondo.finance/blog)|代币化国债、证券、产品与合作公告|代币不自动等于股票法律权利；需发行主体、条款及辖区核验|official-blog|
|P1|[Centrifuge Blog](https://centrifuge.io/blog)|RWA、资产池、基金基础设施与代币化|每个资产池风险和投资者资格不同；协议品牌不保证信用|official-blog|
|P1|[Maple Insights](https://maple.finance/insights)|链上信用、收益、贷款与市场研究|项目兼具利益相关方角色；收益及违约率应核实统计口径|official-insights-list|

### 预言机、跨链与验证基础设施（7 个入口）

|优先级|来源与原始入口|主要价值|权威边界|采集入口|
|---|---|---|---|---|
|P0|[Chainlink Blog](https://chain.link/blog)|预言机、CCIP、CRE、数据与机构互操作|自身性能、采用率和安全表述需要协议配置及独立验证|official-blog|
|P1|[Pyth Network Blog](https://www.pyth.network/blog)|价格数据、数据发布商与预言机集成|成功案例是项目选择的材料；预言机数据质量需单独核验|official-blog|
|P1|[LayerZero Blog](https://layerzero.network/blog)|消息协议、跨链资产、DVN 与升级|安全依赖应用配置和验证者；不能把协议品牌视为统一安全保证|official-blog|
|P1|[Wormhole Blog](https://wormhole.com/blog)|跨链消息、NTT、支持网络与产品迁移|网络支持声明需留意停用日期；桥接资产和消息权限需分别审查|official-blog|
|P1|[Eigen Labs / EigenLayer Blog](https://www.eigenlabs.org/blog/)|再质押、EigenDA、AVS、验证计算与 AI 研究|Labs 产品研究不等于所有 AVS 的安全证明；带开发商利益|official-blog / RSS-link-observed|
|P0|[Flashbots Writings](https://writings.flashbots.net/)|MEV、PBS、区块构建、TEE、隐私与交易执行研究|研究和原型不能直接认定生产可用；商业产品结论要看假设|research-publication|
|P2|[Flashbots Collective](https://collective.flashbots.net/)|MEV 研究交流、提案与技术争议|开放社区作者需识别；论坛讨论不代表 Flashbots 团队决策|discourse-forum|

### DePIN 与去中心化存储（3 个入口）

|优先级|来源与原始入口|主要价值|权威边界|采集入口|
|---|---|---|---|---|
|P1|[Filecoin Blog](https://www.filecoin.io/blog)|存储、检索、Filecoin 网络与云产品更新|项目自述使用量需分清真实客户、存储容量与激励行为|official-blog|
|P1|[Helium Blog](https://www.helium.com/blog)|无线网络、数据卸载、部署者与 HIP 动态|运营公司与基金会治理须区分；连接量不等于付费收入|official-blog|
|P2|[Render Network 官方 Medium](https://medium.com/render-token)|分布式 GPU 渲染、算力与生态公告|由官网 Blog 链接确认；不是同名 render.com 云服务商|medium-publication|

### 钱包、身份、NFT 与开发平台（5 个入口）

|优先级|来源与原始入口|主要价值|权威边界|采集入口|
|---|---|---|---|---|
|P1|[ENS Blog](https://ens.domains/blog)|命名、身份、ENS 协议与集成|团队公告不等于 ENS DAO 治理执行；域名注册量不是活跃用户量|official-blog|
|P2|[OpenSea Blog](https://opensea.io/blog)|NFT 市场、产品、标准与消费者应用|平台业务利益较强；不代表 NFT 全市场或独立成交指标|official-blog|
|P1|[MetaMask News](https://metamask.io/news)|钱包、权限、安全、账户与支付产品动态|产品方资讯；安全建议需对照文档和发布版本|official-news-list|
|P2|[Alchemy Blog](https://www.alchemy.com/blog)|RPC、账户抽象、开发工具与采用案例|技术和商业服务内容混合；供应商比较需独立测试|developer-blog|
|P2|[QuickNode Blog](https://www.quicknode.com/blog)|多链节点、数据流、RPC 和开发工具|供应商观点不等于中立 benchmark；教程与重大新闻需分流|developer-blog|

## 补充的本机 Feed 实测

以下结果引用 [本机实测记录](2026-10-01-web3-feed-probes.json)。成功解析并不等于欧盟服务器可访问或 9BTC 生产采集已验收。候选路径实测不等于出版方明确公布该路径。

|来源|实测入口|结果|
|---|---|---|
|Bitcoin Core 发布与安全公告|[https://bitcoincore.org/en/releasesrss.xml](https://bitcoincore.org/en/releasesrss.xml)|请求失败；不推断源已失效|
|Bitcoin Core 发布与安全公告|[https://github.com/bitcoin/bitcoin/releases.atom](https://github.com/bitcoin/bitcoin/releases.atom)|解析成功，10 条；含日期 10 条|
|Bitcoin Optech|[https://bitcoinops.org/feed.xml](https://bitcoinops.org/feed.xml)|请求失败；不推断源已失效|
|Ethereum Foundation Blog|[https://blog.ethereum.org/en/feed.xml](https://blog.ethereum.org/en/feed.xml)|解析成功，640 条；含日期 640 条|
|Ethereum Research|[https://ethresear.ch/latest.rss](https://ethresear.ch/latest.rss)|解析成功，30 条；含日期 30 条|
|Solana 官方新闻|[https://solana.com/news/rss.xml](https://solana.com/news/rss.xml)|解析成功，20 条；含日期 20 条|
|Optimism Collective 治理论坛|[https://gov.optimism.io/latest.rss](https://gov.optimism.io/latest.rss)|解析成功，30 条；含日期 30 条|
|Arbitrum 治理论坛|[https://forum.arbitrum.foundation/latest.rss](https://forum.arbitrum.foundation/latest.rss)|解析成功，30 条；含日期 30 条|
|Aave 治理论坛|[https://governance.aave.com/latest.rss](https://governance.aave.com/latest.rss)|解析成功，30 条；含日期 30 条|
|Uniswap 治理论坛|[https://gov.uniswap.org/latest.rss](https://gov.uniswap.org/latest.rss)|解析成功，30 条；含日期 30 条|
|Uniswap Labs Blog|[https://blog.uniswap.org/feed.xml](https://blog.uniswap.org/feed.xml)|请求失败；不推断源已失效|
|Lido Governance|[https://research.lido.fi/latest.rss](https://research.lido.fi/latest.rss)|解析成功，30 条；含日期 30 条|
|Chainlink Blog|[https://blog.chain.link/feed/](https://blog.chain.link/feed/)|未通过：HTTP 200 但返回 HTML，0 条文章|

Bitcoin Core 官网 RSS 请求遇到本机 TLS EOF，但官方代码仓库 releases.atom 解析成功。GitHub release 中包含 release candidate，应保留预发布状态；不能将 RC 写成正式发布。Uniswap 博客猜测 feed.xml 返回 404，而治理论坛 RSS 正常，应将两种入口分别验收。

## 本次发现的域名与页面风险

|项目|观察到的变化或限制|建议|
|---|---|---|
|Aptos|aptosfoundation.org/currents → aptosnetwork.com/currents|使用新入口并过滤外部 Press 转引|
|Sui|blog.sui.io → sui.io/blog|重新发现文章列表和 feed，避免依赖旧 Ghost 结构|
|Sky|forum.sky.money → forum.skyeco.com|跟踪重定向与旧 Maker 历史语义，禁止把迁移当作新事件|
|ZKsync|blog.zksync.io → paragraph.com/@zksync|先验收 Paragraph 的文章正文和日期|
|Ondo / Chainlink|分别迁至 ondo.finance/blog、chain.link/blog|更新候选入口，再测试分页和文章抽取|
|EigenLayer|blog.eigenlayer.xyz → eigenlabs.org/blog|明确主体是 Eigen Labs，并按再质押、DA、AI 分主题|
|Filecoin|blog.filecoin.io 无法取得内容，filecoin.io/blog 可读|候选使用可读官网新入口|
|TON|blog.ton.org 跳到 t.me/gram；官网主页获取失败，docs 可读|暂用文档背景源；新闻和社交源单独验证，不自动追随到 Telegram|
|Polkadot|官网 blog、newsroom 获取失败，论坛可读|论坛仅作讨论源；正式决定要对照治理与执行|
|Berachain|博客列表最新可见项是 2025-11-19|降低优先级，先确认更新渠道是否迁移|
|Pendle / Render|官网直接链接 Medium publication；仅栏目可读|身份外链已确认，但未证明新文章全文可采集|

页面读取失败并不说明项目失效或站点下线，只说明这次工具路径未取得内容。Scroll、Arweave 未加入主表：前者博客读取只返回一行，后者官网只返回简要社区入口；需再发现明确且持续更新的一手渠道。

## 为 9BTC 接入设计的建议

第一批可先审议 P0 原始证据源，再添加 P1 行业补充；不得因“官方”直接取消内容筛选。对升级、安全、稳定币支持变更、重要抵押品风险、治理执行、关键基础设施迁移设置事件主题。教程、活动报名、奖励营销和泛化行业展望通常只在专题需要时使用。

同一组织的官网、论坛、开发者和社交账号属于关联证据，不应在热点独立信源计数里机械累加。项目与合作方同时公告时保留双边证据，但区分“合作意向”“测试”“已部署”“实际业务量”。证券与 RWA 产品应保留发行实体、资产权利、准入和司法辖区，稳定币储备应引用原始透明度报告及鉴证文件。

本文件是候选调研与核验记录，不是生产配置。生产接入应经用户选择后逐源测试并记录稳定性、噪声、正文完整性和更新频率。JSON 同伴文件保留每源核验范围，可直接用于后续接入评审。

## 补充核查：Bitcoin 二层、支付网络、预测市场与质押借贷

此轮补全增加 14 个已确认的一手入口；Polymarket 与 Kamino 暂收技术文档背景源，未声称已获得官方新闻流。DFINITY Medium 仅主体和栏目可读。补全后共 82 个入口，P0 21 个、P1 42 个、P2 19 个；6 个为 partial_page。预测市场作为 Web3 关联行业观察，Kalshi 归公司市场信息源，不归去中心化协议。

### Bitcoin 二层与基础设施补充（4 个入口）

|优先级|来源与原始入口|主要价值|权威边界|核验记录|
|---|---|---|---|---|
|P1|[Lightning Labs Blog](https://lightning.engineering/blog/)|LND、Lightning 支付、Taproot Assets、L402 与工具发布|Lightning Labs 是实现和商业服务团队之一，不代表全体 Lightning 或 Bitcoin 共识|官网 lightning.engineering 导航 Blog 直接链接；原站可见文章列表，旧 /posts 路径失败|
|P1|[Blockstream Blog](https://blog.blockstream.com/)|Core Lightning、Liquid、Elements、Simplicity、硬件钱包与安全研究|Blockstream 是商业开发团队；Liquid 的信任模型应区分 Bitcoin 基础层|原站可见近期发布、安全事件、研究与工程栏目|
|P1|[Stacks Blog](https://www.stacks.co/blog)|Stacks 网络、Bitcoin 应用、sBTC 与生态治理动向|包含社区投稿和外部媒体；不能将 Stacks 或 Bitcoin staking 等同 Bitcoin 原生共识|原站列表可读；可见 Submit a post 与 How this blog works，外部原始发布需单独署名|
|P2|[Hiro Mempool Blog](https://www.hiro.so/blog)|Stacks、Clarity、索引 API 和 Bitcoin 应用开发工具|开发服务商技术观点；不代表 Stacks 所有治理机构|原站文章列表可读，栏目标题为 Mempool by Hiro|

### 稳定币支付网络与链补充（3 个入口）

|优先级|来源与原始入口|主要价值|权威边界|核验记录|
|---|---|---|---|---|
|P1|[TRON DAO Announcements](https://trondao.org/announcements)|稳定币、支付、TRON 集成、网络与生态公告|混有第三方媒体转载；链上支付量为项目口径，不能不加说明视为独立统计|通过 trondao.org 页脚 News 精确外链进入；/blog 和 /news 均失败；列表含 Press Release 与 Featured Press 两类|
|P1|[Stellar Development Foundation Blog](https://stellar.org/blog)|跨境支付、稳定币、Soroban、资产发行与开发更新|基金会立场不代表每个发行人信用或法定赎回保障|原站博客列表和文章栏目可读|
|P2|[DFINITY / Internet Computer Review](https://medium.com/dfinity)|ICP、链上计算、Chain Fusion 与开发研究|基金会及投稿作者观点；性能与托管条件应核对协议文档|internetcomputer.org/blog 直接重定向至此；Medium 可见主体与栏目，Latest 未返回文章，标记 partial_page|

### 预测市场与信息交易补充（2 个入口）

|优先级|来源与原始入口|主要价值|权威边界|核验记录|
|---|---|---|---|---|
|P2|[Polymarket Documentation](https://docs.polymarket.com/)|预测市场订单簿、市场数据、结算、开发接口与机制|市场赔率不是事实确认；区域实体、规则和资产托管需分开；文档不是公告流|原站文档目录与机制内容可读；未找到可读官方 blog 或 announcements，候选仅作为技术背景|
|P2|[Kalshi News Announcements](https://news.kalshi.com/t/announcements)|事件合约、预测市场产品、合作、市场基础设施与政策动态|机构运营的预测市场；官网自述 CFTC 监管，不列为去中心化协议；宣传与法定合规文件不同|news.kalshi.com 官方子域栏目可读；kalshi.com 官网有 Regulatory 并明示 CFTC 监管；仅筛选 Announcements 以减少体育和政治行情噪声|

### DeFi 与质押补充（5 个入口）

|优先级|来源与原始入口|主要价值|权威边界|核验记录|
|---|---|---|---|---|
|P1|[ether.fi Blog](https://www.ether.fi/blog)|质押、再质押、金库、支付产品和安全机制|质押收益与具体策略不同；协议宣传不替代金库或托管风险验证|原站文章列表可读|
|P1|[Jito Foundation Blog](https://www.jito.network/blog/)|Solana MEV、JitoSOL、再质押和基金会生态更新|Foundation、Labs、DAO 与节点产品权责不同；需按具体文章主体确认|原站标题明确 Blog Jito Foundation，文章列表可读|
|P2|[Kamino Documentation](https://kamino.com/docs)|Solana 借贷、金库、风险参数、策展人和开发接口|金库和隔离市场风险由配置决定；技术文档不是资金安全担保|docs.kamino.finance 重定向至此且可读；blog.kamino.finance 跳 kamino.com/blog 后无可解析正文，因此未收作新闻流|
|P1|[Spark 官方 Paragraph](https://paragraph.com/@spark-11)|Spark 借贷、Savings、USDS、流动性配置与机构产品|项目收益、自有财务报告与营销需区分；治理应回溯 Sky 提案及实际配置|spark.fi 重定向 spark.finance；官网 Blog 链至 blog.spark.finance 再转此 Paragraph；直接 open 可见最新及热门文章列表|
|P2|[Beefy News](https://beefy.com/articles/)|收益聚合、跨链金库、CLM、风险框架与季度报告|收益自动复投不保证底层策略安全；自身风险清单揭示策展与依赖协议的边界|官网 News/View all Articles 链接与此列表一致，可见 2026 年文章；/blog 路径失败|

Kalshi 的监管定位依据其[官网声明](https://kalshi.com/)；这里没有对其全部产品作逐项法律合规认证。Stacks 官网聚合社区与外部稿件、TRON Announcements 同时有 Press Release 与 Featured Press，因此采集时需逐文保留原始发布者，不能将整个列表统一标成同一官方作者。Spark、Kamino、TRON、Lightning Labs 与 Beefy 的入口迁移均在 JSON 中记录，没有凭域名模式猜测 RSS。
