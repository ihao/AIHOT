# Web3 信源总目录（研究登记表）

> 接入更新：按站长后续授权，生产已新增 88 个验证通过的信源并首次入库 254 条，生产合计 94 源。本文以下保留调研时的判断；最新状态和采集边界见[生产扩充验收报告](2026-10-01-production-source-expansion.md)。

日期：2026-10-01（北京时间）。原始 238 条，合并 8 条重复登记后，共 **230 条信源记录、229 个不同入口URL**，含 **56 名人物**。不同作者可以共享一个机构研究列表，仍分别保留人物记录。同一机构的官网、治理、披露等入口可多条登记；不是同等数量的独立组织，也不是全球排名。

个人部分：44 名专业候选 + 12 名条件观察。`selected`指研究候选，不代表生产批准。

本目录从四份专题清单合并，保留来源链接、覆盖价值、利益与权威边界、核查状态。JSON保留完整原始验证说明和合并来源。未新增生产信源。

[主报告](2026-10-01-web3-source-landscape.md) · [结构化目录](2026-10-01-web3-source-catalog.json) · [RSS实测](2026-10-01-web3-feed-probes.json)

## 协议、标准与治理（82个入口）

|来源与原始入口|主题 / 优先级 / 用途|价值与边界|验证|
|---|---|---|---|
|[Bitcoin Core 发布与安全公告](https://bitcoincore.org/en/releases/)|Bitcoin 与 Ethereum 技术 · P0 · official_project|直接跟踪主流比特币客户端发布与安全修复<br>边界：客户端项目发布不代表全体节点接受某个协议变更|page_readable；官网发布列表可读，并有 RSS Feeds 说明页；未执行 XML 解析。|
|[Bitcoin Improvement Proposals](https://github.com/bitcoin/bips)|Bitcoin 与 Ethereum 技术 · P0 · open_standard_proposals|协议提案原稿、状态和修改历史<br>边界：收录或编号不等于形成共识、合并实现或激活|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Delving Bitcoin](https://delvingbitcoin.org/)|Bitcoin 与 Ethereum 技术 · P1 · project_governance_or_developer_community|开发者的协议设计、安全与实现讨论<br>边界：开放技术社区；发帖者观点不代表 Bitcoin 官方决策|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Bitcoin Optech](https://bitcoinops.org/)|Bitcoin 与 Ethereum 技术 · P0 · independent_specialist_editorial|高密度追踪 Bitcoin 与 Lightning 技术变更并链接原讨论<br>边界：独立专业技术编辑团队；属于二次整理，不是 Bitcoin 官方|page_readable；页面列出近期周刊、支持者和 RSS 链接；feed 获取未成功。|
|[Ethereum Foundation Blog](https://blog.ethereum.org/)|Bitcoin 与 Ethereum 技术 · P0 · official_project|基金会研发、升级、安全与资助公告<br>边界：基金会声明不等于全体 Ethereum 社区或客户端共识|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Ethereum Research](https://ethresear.ch/)|Bitcoin 与 Ethereum 技术 · P0 · project_governance_or_developer_community|扩容、共识、密码学与经济机制的前沿讨论<br>边界：开放研究提案；须识别作者与成熟度，未必进入路线图|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Ethereum Improvement Proposals](https://eips.ethereum.org/)|Bitcoin 与 Ethereum 技术 · P0 · open_standard_proposals|核心协议与 ERC 标准原文和状态<br>边界：Draft、Review、Final 各有含义；Final 也不是全部客户端部署证据|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Ethereum All Core Devs 议程与记录](https://github.com/ethereum/pm)|Bitcoin 与 Ethereum 技术 · P0 · developer_coordination_records|开发协调会议、议程、会议记录与升级讨论<br>边界：会议讨论和目标日期不等于实际主网激活|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Solana 官方新闻](https://solana.com/news)|L1、L2 与模块化网络 · P0 · official_project|网络升级、开发与应用生态的一手公告<br>边界：生态宣传和性能数据需核对测量方法；不自动代表所有生态项目|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Solana Status](https://status.solana.com/)|L1、L2 与模块化网络 · P0 · official_project|故障、维护与恢复时间线<br>边界：运营方报告；不能单靠绿色状态证明所有用户 RPC 正常|page_readable；可见历史事件、RSS 与 Atom 链接；feed 获取未成功。|
|[Optimism Blog](https://optimism.io/blog)|L1、L2 与模块化网络 · P0 · official_project|OP Stack、升级、互操作与企业部署动态<br>边界：基金会和公司内容带商业立场；需区分 Mainnet 与其他 OP 链|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Optimism Collective 治理论坛](https://gov.optimism.io/)|L1、L2 与模块化网络 · P1 · project_governance_or_developer_community|治理提案、预算、升级和资助讨论<br>边界：论坛讨论、投票通过与链上执行是不同状态|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Arbitrum Blog](https://blog.arbitrum.io/)|L1、L2 与模块化网络 · P0 · official_project|Arbitrum 技术、网络与生态公告<br>边界：基金会、开发商与 DAO 权限须分别识别|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Arbitrum 治理论坛](https://forum.arbitrum.foundation/)|L1、L2 与模块化网络 · P1 · project_governance_or_developer_community|DAO 预算、委托人、生态与升级提案<br>边界：社区作者不等于基金会；提案不等于资金拨付或升级执行|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Base Blog](https://blog.base.org/)|L1、L2 与模块化网络 · P0 · official_project|Base 网络与产品动向<br>边界：官方运营者的网络公告；不可将宣传直接当作采用数据|partial_page；页面可读，但只返回 27 行简要内容；文章列表与正文采集仍须实测。|
|[Starknet Blog](https://www.starknet.io/blog/)|L1、L2 与模块化网络 · P1 · official_project|ZK 扩容、Cairo、网络升级与研发<br>边界：生态文章与技术结论应区分；路线图不等于上线|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[ZKsync 官方 Paragraph](https://paragraph.com/@zksync)|L1、L2 与模块化网络 · P1 · official_project|ZK Stack、ZKsync 与协议升级动向<br>边界：项目观点带生态利益；动态页面需另测正文采集|partial_page；从 https://blog.zksync.io/ 跳转至此；页面仅返回简要壳内容。|
|[Polygon Blog](https://polygon.technology/blog)|L1、L2 与模块化网络 · P1 · official_project|Polygon 升级、Agglayer 与支付稳定币生态<br>边界：不同产品网络不可混称；合作声明需核实上线状态|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Avalanche Builder Hub Blog](https://docs.avax.network/blog)|L1、L2 与模块化网络 · P1 · official_project|ACP、验证者规则、AvalancheGo 与网络升级<br>边界：Ava Labs DevRel 解释不替代代码、ACP 状态和链上激活|page_readable；www.avax.network/blog 获取失败；此 Ava Labs DevRel 博客可读。|
|[Aptos 官方 Currents](https://aptosnetwork.com/currents)|L1、L2 与模块化网络 · P1 · official_project|Move、网络、支付、开发与生态公告<br>边界：页面混有 Press 外部报道；采集需保留原始作者和出处|page_readable；从 https://aptosfoundation.org/currents 跳转到此；同时包含基金会内容与第三方 Press 链接。|
|[Sui Blog](https://www.sui.io/blog)|L1、L2 与模块化网络 · P1 · official_project|Move、网络发布、安全、应用与 Sui Stack<br>边界：基金会与开发商内容有生态立场；测试指标不等于生产指标|page_readable；从 https://blog.sui.io/ 跳转到此。|
|[BNB Chain Blog](https://www.bnbchain.org/en/blog)|L1、L2 与模块化网络 · P1 · official_project|BNB Chain 网络、开发与生态公告<br>边界：与 Binance 交易所公告分开；公链宣传不证明资产风险可控|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Cosmos Blog](https://cosmos.network/blog)|L1、L2 与模块化网络 · P1 · official_project|Cosmos SDK、IBC、网络与生态研究<br>边界：Cosmos 官网不能代表每条 Cosmos 链的治理决定|page_readable；从 https://blog.cosmos.network/ 跳转到此。|
|[Celestia Blog](https://blog.celestia.org/)|L1、L2 与模块化网络 · P1 · official_project|数据可用性、模块化、网络升级与性能研究<br>边界：性能宣称需核对环境；DA 项目不等于所有 rollup 的安全保证|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Polkadot Forum](https://forum.polkadot.network/)|L1、L2 与模块化网络 · P2 · project_governance_or_developer_community|Polkadot 技术与生态讨论入口<br>边界：社区论坛；帖子不等于 OpenGov 公投或执行记录|page_readable；社区论坛可读；polkadot.com/blog 与 newsroom 入口获取失败，首页无可解析正文。|
|[NEAR Blog](https://www.near.org/blog)|L1、L2 与模块化网络 · P1 · official_project|链抽象、账户、协议与 AI 应用动态<br>边界：商业和基金会叙述需与网络技术文档相互核对|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[TON 开发者文档](https://docs.ton.org/)|L1、L2 与模块化网络 · P2 · official_project|TON 协议、开发、节点与应用技术参考<br>边界：静态文档偏背景；不作为高频新闻流，也不等于 Telegram 全部产品信息|page_readable；docs.ton.org 可读；www.ton.org/en 获取失败。blog.ton.org 跳至 t.me/gram，未将其收为候选内容流。|
|[Berachain Blog](https://blog.berachain.com/)|L1、L2 与模块化网络 · P2 · official_project|Proof of Liquidity、网络与治理公告<br>边界：当前列表最新可见条目在 2025 年；活跃性须重新评估|page_readable；页面可读，最新可见列表项为 2025-11-19；未证明 2026 年持续更新。|
|[Monad Documentation](https://docs.monad.xyz/)|L1、L2 与模块化网络 · P2 · official_project|EVM 执行、节点、网络与开发机制参考<br>边界：偏技术背景源；发布新闻另需发现并验收入口|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Ripple Insights](https://ripple.com/insights/)|L1、L2 与模块化网络 · P1 · official_project|支付、XRP Ledger 相关产品、RLUSD 与机构应用<br>边界：Ripple 公司观点不能代表 XRP Ledger 全部社区或治理|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Cardano Foundation Blog](https://cardanofoundation.org/blog)|L1、L2 与模块化网络 · P2 · official_project|Cardano 采用、研究、治理和基金会活动<br>边界：基金会是生态组织之一；不可将其等同所有协议开发方或治理主体|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Aave 治理论坛](https://governance.aave.com/)|DeFi 与流动性质押 · P0 · project_governance_or_developer_community|借贷参数、抵押品、风险评估、部署与 GHO 讨论<br>边界：TEMP CHECK、ARFC、AIP 与执行不同；风险服务商声明也需署名|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Aave Labs Blog](https://aave.com/blog)|DeFi 与流动性质押 · P1 · official_project|协议架构、发布、产品和应用研究<br>边界：Labs 产品与 DAO 治理不同；自述安全结果需对应审计报告|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Uniswap 治理论坛](https://gov.uniswap.org/)|DeFi 与流动性质押 · P0 · project_governance_or_developer_community|费率、跨链部署、治理与资金提案<br>边界：RFC、Temperature Check 不等于投票通过或已执行|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Uniswap Labs Blog](https://blog.uniswap.org/)|DeFi 与流动性质押 · P1 · official_project|AMM、Hooks、UniswapX、钱包与技术研究<br>边界：Labs、Foundation、协议 DAO 须分开；前端上线不等于协议变更|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Sky 治理论坛](https://forum.skyeco.com/)|DeFi 与流动性质押 · P0 · project_governance_or_developer_community|稳定币治理、风险参数、抵押品与 RWA 讨论<br>边界：论坛提案需关联 Executive Vote 与实际链上执行|page_readable；从 https://forum.sky.money/ 跳转到此。|
|[Curve Governance](https://gov.curve.finance/)|DeFi 与流动性质押 · P1 · project_governance_or_developer_community|稳定币流动性、crvUSD、治理与激励<br>边界：论坛建议、Gauge 投票与实际资金影响需分别验证|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Compound Community Forum](https://www.comp.xyz/)|DeFi 与流动性质押 · P1 · project_governance_or_developer_community|借贷市场、风险参数和治理提案<br>边界：开放社区；需跟踪提案编号、投票状态和执行交易|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Lido Governance](https://research.lido.fi/)|DeFi 与流动性质押 · P0 · project_governance_or_developer_community|流动性质押、节点运营、安全和协议治理<br>边界：服务商、贡献者、DAO 权限不同；讨论不是协议执行|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Morpho Blog](https://morpho.org/blog/)|DeFi 与流动性质押 · P1 · official_project|借贷机制、金库、风险隔离与机构集成<br>边界：金库风险取决于策展人和配置；协议方宣传不替代逐库尽调|page_readable；带 www 的地址获取失败；morpho.org/blog/ 可读。|
|[Pendle 官方 Medium](https://medium.com/pendle)|DeFi 与流动性质押 · P1 · official_project|收益拆分、PT/YT、利率交易与 Boros 动态<br>边界：由官网直接链接；产品机制解释不是固定收益承诺|partial_page；https://www.pendle.finance/ 页脚 Blog 直接链接此 Medium；页面可读，仅显示栏目和编辑信息。|
|[Hyperliquid Docs](https://hyperliquid.gitbook.io/hyperliquid-docs)|DeFi 与流动性质押 · P1 · official_project|永续、订单簿、HyperCore 与 HyperEVM 原始机制<br>边界：性能与透明度为项目自述；交易风险需验证链上与 API 数据|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Jupiter Developer Blog](https://developers.jup.ag/blog)|DeFi 与流动性质押 · P1 · official_project|Solana 聚合路由、报价、执行与 API 更新<br>边界：技术博客覆盖开发产品；不能代替所有 Jupiter DAO 或代币公告|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[dYdX Blog](https://www.dydx.xyz/blog)|DeFi 与流动性质押 · P2 · official_project|去中心化衍生品、产品与交易基础设施<br>边界：推广活动噪声较多；原 Labs、链和新产品权责应按文章区分|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Balancer Forum](https://forum.balancer.fi/)|DeFi 与流动性质押 · P2 · project_governance_or_developer_community|AMM、激励、风险与 DAO 讨论<br>边界：开放提案，须确认投票和执行；安全事件需对照技术事后报告|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Rocket Pool Governance](https://dao.rocketpool.net/)|DeFi 与流动性质押 · P2 · project_governance_or_developer_community|去中心化节点质押、协议升级与治理<br>边界：协议 DAO 与 oracle DAO 角色须区分；帖子不等于 RPIP 已实施|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Circle Blog](https://www.circle.com/blog)|稳定币与 RWA · P0 · official_project|USDC、EURC、CCTP、支付与产品支持变更<br>边界：发行人一手声明有商业立场；储备、赎回与监管结论另核验原始文件|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Tether News](https://tether.io/news/)|稳定币与 RWA · P0 · official_project|USDT、跨链发行、冻结和公司公告<br>边界：发行人公告不替代储备鉴证、监管文件或独立风险结论|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Paxos Blog](https://www.paxos.com/blog)|稳定币与 RWA · P1 · official_project|PYUSD、USDG、USDP、PAXG 与发行基础设施<br>边界：监管表述需原监管文件；博客不等于审计意见|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Ethena Blog](https://ethena.fi/blog)|稳定币与 RWA · P1 · official_project|USDe、USDtb、对冲机制、网络与产品公告<br>边界：合成美元风险不能类比现金储备稳定币；需透明度和托管对冲数据|partial_page；博客标题、官网导航及治理入口可见，但文章列表未返回。|
|[Ondo Finance Blog](https://ondo.finance/blog)|稳定币与 RWA · P0 · official_project|代币化国债、证券、产品与合作公告<br>边界：代币不自动等于股票法律权利；需发行主体、条款及辖区核验|page_readable；从 https://blog.ondo.finance/ 跳转到此。|
|[Centrifuge Blog](https://centrifuge.io/blog)|稳定币与 RWA · P1 · official_project|RWA、资产池、基金基础设施与代币化<br>边界：每个资产池风险和投资者资格不同；协议品牌不保证信用|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Maple Insights](https://maple.finance/insights)|稳定币与 RWA · P1 · official_project|链上信用、收益、贷款与市场研究<br>边界：项目兼具利益相关方角色；收益及违约率应核实统计口径|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Chainlink Blog](https://chain.link/blog)|预言机、跨链与验证基础设施 · P0 · official_project|预言机、CCIP、CRE、数据与机构互操作<br>边界：自身性能、采用率和安全表述需要协议配置及独立验证|page_readable；从 https://blog.chain.link/ 跳转到此。|
|[Pyth Network Blog](https://www.pyth.network/blog)|预言机、跨链与验证基础设施 · P1 · official_project|价格数据、数据发布商与预言机集成<br>边界：成功案例是项目选择的材料；预言机数据质量需单独核验|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[LayerZero Blog](https://layerzero.network/blog)|预言机、跨链与验证基础设施 · P1 · official_project|消息协议、跨链资产、DVN 与升级<br>边界：安全依赖应用配置和验证者；不能把协议品牌视为统一安全保证|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Wormhole Blog](https://wormhole.com/blog)|预言机、跨链与验证基础设施 · P1 · official_project|跨链消息、NTT、支持网络与产品迁移<br>边界：网络支持声明需留意停用日期；桥接资产和消息权限需分别审查|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Eigen Labs / EigenLayer Blog](https://www.eigenlabs.org/blog/)|预言机、跨链与验证基础设施 · P1 · official_project|再质押、EigenDA、AVS、验证计算与 AI 研究<br>边界：Labs 产品研究不等于所有 AVS 的安全证明；带开发商利益|page_readable；从 https://blog.eigenlayer.xyz/ 跳转到此；官网可见 RSS 链接，但 feed 获取未成功。|
|[Flashbots Writings](https://writings.flashbots.net/)|预言机、跨链与验证基础设施 · P0 · official_project|MEV、PBS、区块构建、TEE、隐私与交易执行研究<br>边界：研究和原型不能直接认定生产可用；商业产品结论要看假设|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Flashbots Collective](https://collective.flashbots.net/)|预言机、跨链与验证基础设施 · P2 · project_governance_or_developer_community|MEV 研究交流、提案与技术争议<br>边界：开放社区作者需识别；论坛讨论不代表 Flashbots 团队决策|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Filecoin Blog](https://www.filecoin.io/blog)|DePIN 与去中心化存储 · P1 · official_project|存储、检索、Filecoin 网络与云产品更新<br>边界：项目自述使用量需分清真实客户、存储容量与激励行为|page_readable；旧 https://blog.filecoin.io/ 获取失败；此官网 blog 列表可读。|
|[Helium Blog](https://www.helium.com/blog)|DePIN 与去中心化存储 · P1 · official_project|无线网络、数据卸载、部署者与 HIP 动态<br>边界：运营公司与基金会治理须区分；连接量不等于付费收入|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Render Network 官方 Medium](https://medium.com/render-token)|DePIN 与去中心化存储 · P2 · official_project|分布式 GPU 渲染、算力与生态公告<br>边界：由官网 Blog 链接确认；不是同名 render.com 云服务商|partial_page；https://rendernetwork.com/ 页脚 Blog 直接链接此 Medium；页面可读，仅显示栏目和编辑信息。|
|[ENS Blog](https://ens.domains/blog)|钱包、身份、NFT 与开发平台 · P1 · official_project|命名、身份、ENS 协议与集成<br>边界：团队公告不等于 ENS DAO 治理执行；域名注册量不是活跃用户量|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[OpenSea Blog](https://opensea.io/blog)|钱包、身份、NFT 与开发平台 · P2 · official_project|NFT 市场、产品、标准与消费者应用<br>边界：平台业务利益较强；不代表 NFT 全市场或独立成交指标|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[MetaMask News](https://metamask.io/news)|钱包、身份、NFT 与开发平台 · P1 · official_project|钱包、权限、安全、账户与支付产品动态<br>边界：产品方资讯；安全建议需对照文档和发布版本|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Alchemy Blog](https://www.alchemy.com/blog)|钱包、身份、NFT 与开发平台 · P2 · official_project|RPC、账户抽象、开发工具与采用案例<br>边界：技术和商业服务内容混合；供应商比较需独立测试|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[QuickNode Blog](https://www.quicknode.com/blog)|钱包、身份、NFT 与开发平台 · P2 · official_project|多链节点、数据流、RPC 和开发工具<br>边界：供应商观点不等于中立 benchmark；教程与重大新闻需分流|page_readable；原站页面已读取；页面身份、内容栏目或提案列表可见。|
|[Lightning Labs Blog](https://lightning.engineering/blog/)|Bitcoin 二层与基础设施补充 · P1 · official_project|LND、Lightning 支付、Taproot Assets、L402 与工具发布<br>边界：Lightning Labs 是实现和商业服务团队之一，不代表全体 Lightning 或 Bitcoin 共识|page_readable；官网 lightning.engineering 导航 Blog 直接链接；原站可见文章列表，旧 /posts 路径失败|
|[Blockstream Blog](https://blog.blockstream.com/)|Bitcoin 二层与基础设施补充 · P1 · official_project|Core Lightning、Liquid、Elements、Simplicity、硬件钱包与安全研究<br>边界：Blockstream 是商业开发团队；Liquid 的信任模型应区分 Bitcoin 基础层|page_readable；原站可见近期发布、安全事件、研究与工程栏目|
|[Stacks Blog](https://www.stacks.co/blog)|Bitcoin 二层与基础设施补充 · P1 · official_project|Stacks 网络、Bitcoin 应用、sBTC 与生态治理动向<br>边界：包含社区投稿和外部媒体；不能将 Stacks 或 Bitcoin staking 等同 Bitcoin 原生共识|page_readable；原站列表可读；可见 Submit a post 与 How this blog works，外部原始发布需单独署名|
|[Hiro Mempool Blog](https://www.hiro.so/blog)|Bitcoin 二层与基础设施补充 · P2 · official_project|Stacks、Clarity、索引 API 和 Bitcoin 应用开发工具<br>边界：开发服务商技术观点；不代表 Stacks 所有治理机构|page_readable；原站文章列表可读，栏目标题为 Mempool by Hiro|
|[TRON DAO Announcements](https://trondao.org/announcements)|稳定币支付网络与链补充 · P1 · official_project|稳定币、支付、TRON 集成、网络与生态公告<br>边界：混有第三方媒体转载；链上支付量为项目口径，不能不加说明视为独立统计|page_readable；通过 trondao.org 页脚 News 精确外链进入；/blog 和 /news 均失败；列表含 Press Release 与 Featured Press 两类|
|[Stellar Development Foundation Blog](https://stellar.org/blog)|稳定币支付网络与链补充 · P1 · official_project|跨境支付、稳定币、Soroban、资产发行与开发更新<br>边界：基金会立场不代表每个发行人信用或法定赎回保障|page_readable；原站博客列表和文章栏目可读|
|[DFINITY / Internet Computer Review](https://medium.com/dfinity)|稳定币支付网络与链补充 · P2 · official_project|ICP、链上计算、Chain Fusion 与开发研究<br>边界：基金会及投稿作者观点；性能与托管条件应核对协议文档|partial_page；internetcomputer.org/blog 直接重定向至此；Medium 可见主体与栏目，Latest 未返回文章，标记 partial_page|
|[Polymarket Documentation](https://docs.polymarket.com/)|预测市场与信息交易补充 · P2 · official_project|预测市场订单簿、市场数据、结算、开发接口与机制<br>边界：市场赔率不是事实确认；区域实体、规则和资产托管需分开；文档不是公告流|page_readable；原站文档目录与机制内容可读；未找到可读官方 blog 或 announcements，候选仅作为技术背景|
|[Kalshi News Announcements](https://news.kalshi.com/t/announcements)|预测市场与信息交易补充 · P2 · regulated_marketplace_company|事件合约、预测市场产品、合作、市场基础设施与政策动态<br>边界：机构运营的预测市场；官网自述 CFTC 监管，不列为去中心化协议；宣传与法定合规文件不同|page_readable；news.kalshi.com 官方子域栏目可读；kalshi.com 官网有 Regulatory 并明示 CFTC 监管；仅筛选 Announcements 以减少体育和政治行情噪声|
|[ether.fi Blog](https://www.ether.fi/blog)|DeFi 与质押补充 · P1 · official_project|质押、再质押、金库、支付产品和安全机制<br>边界：质押收益与具体策略不同；协议宣传不替代金库或托管风险验证|page_readable；原站文章列表可读|
|[Jito Foundation Blog](https://www.jito.network/blog/)|DeFi 与质押补充 · P1 · official_project|Solana MEV、JitoSOL、再质押和基金会生态更新<br>边界：Foundation、Labs、DAO 与节点产品权责不同；需按具体文章主体确认|page_readable；原站标题明确 Blog Jito Foundation，文章列表可读|
|[Kamino Documentation](https://kamino.com/docs)|DeFi 与质押补充 · P2 · official_project|Solana 借贷、金库、风险参数、策展人和开发接口<br>边界：金库和隔离市场风险由配置决定；技术文档不是资金安全担保|page_readable；docs.kamino.finance 重定向至此且可读；blog.kamino.finance 跳 kamino.com/blog 后无可解析正文，因此未收作新闻流|
|[Spark 官方 Paragraph](https://paragraph.com/@spark-11)|DeFi 与质押补充 · P1 · official_project|Spark 借贷、Savings、USDS、流动性配置与机构产品<br>边界：项目收益、自有财务报告与营销需区分；治理应回溯 Sky 提案及实际配置|page_readable；spark.fi 重定向 spark.finance；官网 Blog 链至 blog.spark.finance 再转此 Paragraph；直接 open 可见最新及热门文章列表|
|[Beefy News](https://beefy.com/articles/)|DeFi 与质押补充 · P2 · official_project|收益聚合、跨链金库、CLM、风险框架与季度报告<br>边界：收益自动复投不保证底层策略安全；自身风险清单揭示策展与依赖协议的边界|page_readable；官网 News/View all Articles 链接与此列表一致，可见 2026 年文章；/blog 路径失败|

## 机构、监管与披露（70个入口）

|来源与原始入口|主题 / 优先级 / 用途|价值与边界|验证|
|---|---|---|---|
|[Coin Metrics / Talos](https://www.talos.com/insights)|data-research · P0 · 网页研究栏目 / newsletter|链上、市场数据与 State of the Network；覆盖跨生态数据解释。<br>边界：第三方研究，指标依赖自身口径；商业数据商。旧域跳转不等于所有 RSS 已迁移。|官方网页已读取；coinmetrics.io/insights 实际跳转至本地址；研究目录含 State of the Network。|
|[Glassnode Research](https://research.glassnode.com/)|data-research · P0 · 研究博客|BTC/ETH 链上持币、周期与市场结构研究。<br>边界：实体聚类和资金流为模型解释；地址数不等于用户数；商业数据产品。|官方研究网页已读取；不等同已测试 RSS。|
|[Nansen](https://nansen.ai/blog)|data-research · P1 · 博客 / 研究|钱包标签、资金行为与多链研究。<br>边界：Smart Money 为自定义标签；标签不能独立证明真实身份或内幕行为；商业产品。|nansen.ai/research 跳转至博客；官方列表已读取。|
|[CryptoQuant Quicktake](https://cryptoquant.com/insights/quicktake)|data-research · P1 · 研究 / 投稿流|交易所流入流出、链上趋势与市场观察。<br>边界：Quicktake 包含外部投稿，不全是机构研究；推测需注明作者与数据窗口。|官方 Quicktake 页面已读取；列表抽取较少，作者逐条核实。|
|[Kaiko](https://www.kaiko.com/resources/categories/data-blog)|data-research · P0 · Data Blog / Research app|流动性、订单簿、交易所、衍生品市场结构。<br>边界：采样交易所和聚合方法决定覆盖；商业数据与合作研究需保留披露。|官方 Data Blog 已读取；旧 research.kaiko.com 跳转 app.kaiko.com，后者文本抽取为空。|
|[CoinDesk Data（原 CCData 入口）](https://data.coindesk.com/reports)|data-research · P1 · 报告目录|交易所、稳定币、衍生品与基金报告。<br>边界：区分数据研究与 CoinDesk 新闻编辑内容；交易所评级由自定方法生成。|ccdata.io/research 实际跳转本地址；官方报告页已读取。|
|[Messari](https://messari.io/research)|data-research · P1 · 研究目录|项目基本面、季度行业研究与治理分析。<br>边界：第三方分析不等同项目官方；区分付费、委托/赞助与独立研究。|官方目录已读取；当前页面标题含 Messari by Blockworks，仅记录页面事实。|
|[Artemis](https://about.artemis.ai/research)|data-research · P0 · 研究目录|链活跃度、稳定币支付与跨链经济指标。<br>边界：活跃地址、交易数、支付量不同于真实用户和商品消费；商业数据口径。|artemisanalytics.com/research 跳转本地址；官方研究页已读取。|
|[Token Terminal](https://tokenterminal.com/)|data-research · P0 · 指标平台 / 研究|协议费用、收入及基本面标准化数据。<br>边界：费用、协议收入、代币持有人收入不能混用；不是财报审计；商业数据产品。|官方平台页面及 Fees、Revenue 等目录已读取；未测试 API。|
|[Dune](https://dune.com/home)|data-research · P1 · 数据仪表板 / SQL|可复核 SQL 与链上仪表板。<br>边界：平台不是每个用户仪表板的事实背书；必须选作者、查询版本、链和时间窗口。|dune.com 跳转 /home；官方平台页已读取。|
|[DefiLlama](https://defillama.com/)|data-research · P0 · 数据平台 / 方法 / API 文档|TVL、DEX/永续成交、费用、稳定币与多链对比。<br>边界：TVL 受适配器、资产价格和重复计数定义影响；不是项目审计。|官方平台已读取，见 Data Definitions 和 API 链接；未测试 API。|
|[Electric Capital Developer Report](https://www.developerreport.com/)|data-research · P0 · 年度报告 / 数据平台|开源开发者迁移、生态开发者规模与年度报告。<br>边界：GitHub 活动不能等同真实用户/商业收入；风投持仓与分类方法影响结果。|官方 Developer Report 页面已读取，标题明确由 Electric Capital 发布。|
|[L2BEAT](https://l2beat.com/)|data-research · P0 · 风险数据库 / 研究|L2 技术、安全假设、去中心化阶段与风险资料。<br>边界：Stage/风险维度是公开框架评价；不是收益评级或运行无风险保证。|官方平台已读取；纳入用于风险核验而非仅按 TVL 排名。|
|[RWA.xyz](https://docs.rwa.xyz/home)|data-research · P0 · 方法文档 / 数据平台候选|代币化资产分类、数据模型、方法与 API 说明。<br>边界：发行人提供的链外资产需外部证据；上链数量不保证底层资产法律权益或偿付。|官方 docs.rwa.xyz 已读取；rwa.xyz 超工具文本上限，app.rwa.xyz 读取失败；未验证仪表板采集。|
|[Tokenomist](https://tokenomist.ai/)|data-research · P1 · 解锁数据平台|解锁、归属期与流通供应计划。<br>边界：计划解锁不等于实际卖压；以项目最新合约/官方计划交叉核查。|官方平台页面已读取；未测试数据接口。|
|[Cambridge Centre for Alternative Finance](https://www.jbs.cam.ac.uk/faculty-research/centres/alternative-finance/)|data-research · P1 · 研究中心 / 报告|学术机构数字资产研究、矿业、监管比较与实证调查。<br>边界：低频严谨研究；调查有样本限制，需记录资助者和方法；不能冒充即时监管文件。|剑桥官方中心网页已检索并读取，含 Digital Assets Programme 和方法说明。|
|[Chainalysis](https://www.chainalysis.com/blog/)|investigation · P0 · 博客 / 报告|犯罪、采用、监管与链上资金追踪报告。<br>边界：已知非法地址集合会更新；非法占比依定义/分母而变，链外犯罪不可能仅由链上完全确定；商业 AML 服务。|官方博客与 Crypto Crime 方法说明已读取。|
|[TRM Labs](https://www.trmlabs.com/resources)|investigation · P0 · 报告 / 博客 / 白皮书|金融犯罪、制裁、稳定币与全球政策研究。<br>边界：地址归因与犯罪估计依赖模型/客户/样本；不能与其他机构口径直接相加。|官方 Resources 页面已读取。|
|[Elliptic](https://www.elliptic.co/insights/)|investigation · P1 · Insights / 报告|制裁、犯罪、跨链洗钱与合规情报。<br>边界：第三方情报，不是法院判决；商业合规产品，地址归因需证据等级。|elliptic.co/blog 跳转 /insights/；官方列表已读取。|
|[CertiK](https://www.certik.com/blog)|security · P1 · 安全博客|漏洞、攻击复盘与损失统计。<br>边界：审计范围、版本和客户利益必须保留；安全评分不是资产无风险证明。|旧 /resources/blog 跳转 /blog；官方文章列表已读取。|
|[SlowMist / 慢雾](https://slowmist.medium.com/)|security · P0 · Medium 博客 / 官网|中文生态安全事件、攻击复盘、链上追踪与防骗。<br>边界：审计服务商；初期归因和损失金额可修订，需项目公告/链上记录互证。|Medium 官方署名页及 slowmist.com 官网已读取；官网对应身份已核。|
|[PeckShield](https://peckshield.com/)|security · P1 · 官网身份入口 / X 候选|安全预警、攻击事件与链上取证候选。<br>边界：快讯初判需原始交易和后续复盘确认；审计服务商；不要仅凭 X 同名账号。|官网标题已确认，但仅 1 行可抽取；社交账号与最新帖子未逐条验证，保留候选。|
|[BlockSec](https://blocksec.com/blog)|security · P0 · 安全博客|攻击路径、交易分析、DeFi 防护与安全复盘。<br>边界：商业防护/审计服务；自报阻止攻击与损失统计需保留方法。|官方 Blog 页面已读取。|
|[Trail of Bits](https://blog.trailofbits.com/)|security · P0 · 技术博客|密码学、ZK、虚拟机、智能合约审计与可复现工具。<br>边界：商业安全顾问；审计仅对指定版本/范围负责；综合软件安全博客需 Web3 过滤。|官方博客已读取，有区块链漏洞与 Uniswap hooks 等文章。|
|[OpenZeppelin](https://www.openzeppelin.com/news)|security · P0 · News / 审计报告|合约库发布、安全审计、漏洞与开发安全实践。<br>边界：对自有代码库发布是一手；对受审项目仅是限定版本审计意见，不能替代持续风控。|官方 News 页面已读取。|
|[OtterSec](https://osec.io/blog/)|security · P1 · 技术博客|Solana、Move 等生态漏洞与技术审计。<br>边界：商业审计机构；区分公开复盘、客户报告与产品介绍。|官方 Blog 列表已读取。|
|[Immunefi](https://immunefi.com/blog/)|security · P0 · 安全博客 / 赏金项目|漏洞赏金、攻击损失报告与研究者披露。<br>边界：赏金平台数据具有覆盖边界；收录项目不代表无漏洞，报告统计需注明样本。|官方 Blog 页面已读取。|
|[Halborn](https://www.halborn.com/blog)|security · P1 · 安全博客|漏洞解释、攻击复盘与钱包/链安全。<br>边界：商业审计公司；需筛掉营销和通用科普，审计不是未来安全保证。|官方 Blog 列表已读取。|
|[Gauntlet](https://www.gauntlet.xyz/resources)|risk-research · P0 · 研究 / 资源 / 治理建议|DeFi 经济安全、风险模型、参数与治理建议。<br>边界：风险服务商可能直接管理策略/金库；建议不等于 DAO 已通过，模型参数和客户关系须保留。|官方 Resources 列表已读取。|
|[Chaos Labs](https://chaoslabs.xyz/)|risk-research · P1 · 官网 / 方法 PDF / 治理候选|经济安全、模拟、协议风险与参数研究。<br>边界：模型有未公开部分；风险服务/预言机/策略产品利益关系须标明；提交建议不等于实施。|官网官方搜索证据与官方 GMX risk methodology PDF 已核；/resources 本轮读取失败。|
|[a16z crypto](https://a16zcrypto.com/posts/)|investor-research · P0 · 研究 / 技术 / 政策栏目|技术研究、行业年度报告、开发工具与政策分析。<br>边界：风投持仓和政策立场会影响选题；独立技术证明与投资叙事分别标注。|官方 All Content 列表已读取。|
|[Paradigm](https://www.paradigm.xyz/writing)|investor-research · P0 · 技术研究 / Writing|机制设计、AMM、MEV、技术与政策原始研究。<br>边界：投资者对持仓项目有利益；技术推导需假设/实验支持，观点不是市场事实。|官方 Writing 列表已读取。|
|[Galaxy Research](https://www.galaxy.com/insights/research)|investor-research · P0 · 研究报告|宏观市场、协议、矿业与机构配置研究。<br>边界：交易、资管和投行业务利益；研究估值不等于确定收益或独立审计。|官方 Research 页面已读取。|
|[Delphi Digital](https://members.delphidigital.io/)|investor-research · P1 · 会员研究 / 公开媒体|机制、生态和专题深度研究。<br>边界：研究、投资和孵化业务潜在交叉；必须保留透明度披露；会员内容不可绕过。|官方目录已读取，见 Login、Subscription、Transparency；未进入付费内容。|
|[Binance Research](https://www.binance.com/en/research)|investor-research · P1 · 行业 / 项目研究|月报、细分行业与项目经济模型报告。<br>边界：交易所和上币生态利益；自称 unbiased 不能作为独立性证明；项目简介不等于外部核验。|research.binance.com 跳转此地址；官方列表及免责声明已读取。|
|[Coinbase Institutional Research](https://www.coinbase.com/institutional/research-insights)|investor-research · P1 · 机构研究入口|机构市场观点、周报与年度研究。<br>边界：交易所/托管/产品利益；研究观点不等于平台审计或监管认定。|官方页面标题已确认，但正文抽取 0 行；采集适配待验证。|
|[Bitwise](https://bitwiseinvestments.com/crypto-market-insights)|investor-research · P1 · 市场研究 / Insights|市场季报、机构采用、质押与投资组合研究。<br>边界：ETF/资管发行人利益明显；调查样本和预测要标注；自身产品数据与观点分开。|官方 Insights 已读取，含 Research 与 Expert Portal 区别。|
|[Grayscale Research](https://institute.grayscale.com/)|investor-research · P1 · 研究 / Institute / The Stack 候选|资管视角行业分类、代币研究与数字资产教育。<br>边界：发行人可能持有讨论资产；教育/观点不等于推荐；页面声明转载需许可，只链接自写摘要。|官方 Institute 已读取并链接 The Stack；grayscale.com/research 本轮读取失败。|
|[CoinShares](https://coinshares.com/insights/)|investor-research · P0 · 研究 / Fund Flows|数字资产基金资金流、市场和投资研究。<br>边界：基金流不是全行业资金流；发行人利益与统计产品范围须说明。|官方 Insights 列表已读取。|
|[Fidelity Digital Assets](https://www.fidelitydigitalassets.com/research-and-insights)|investor-research · P1 · 研究 / Insights|机构持有、投资框架和数字资产技术研究。<br>边界：托管/服务商利益；调查样本不能代表全球所有投资者。|官方 Research 页面已读取。|
|[美国 SEC](https://www.sec.gov/newsroom/press-releases)|regulatory · P0 · 新闻稿 / 规则 / EDGAR|证券、ETF、执法和规则的一手发布。<br>边界：新闻稿不是完整裁判/规则正文；诉讼指控不等于定罪，提案不等于生效。|官方 Press Releases 已读取，含 RSS 导航；本文未测试 feed。|
|[美国 CFTC](https://www.cftc.gov/PressRoom/PressReleases)|regulatory · P0 · 新闻稿 / 规则 / Staff letters|衍生品、商品、预测市场与执法一手发布。<br>边界：适用范围要按商品/衍生品/主体区分；职员意见和 no-action letter 不等同国会法律。|官方 Press Releases 列表已读取。|
|[美国财政部 OFAC](https://ofac.treasury.gov/recent-actions)|regulatory · P0 · Recent Actions / 制裁名单|制裁更新、名单与执法公告。<br>边界：美国制裁管辖；地址名单与整个协议/所有用户不应泛化；需对照生效日和 FAQ。|官方 Recent Actions 已读取。|
|[美国 FinCEN](https://www.fincen.gov/news)|regulatory · P1 · News / Advisories / 规则|反洗钱规则、金融犯罪通告和处罚。<br>边界：区分拟议规则、最终规则、指引与警报；针对主体业务的要求不能随意推广。|旧 /news-room 跳转 /news；官方页面已读取。|
|[FATF](https://www.fatf-gafi.org/en/topics/virtual-assets.html)|standards-policy · P0 · 专题 / 报告 / Recommendations|VASP、Travel Rule、DeFi 功能性监管与全球 AML 标准。<br>边界：国际标准需由司法辖区实施；不是可直接套用的全球法律。|官方 Virtual Assets 页面已读取。|
|[Financial Stability Board](https://www.fsb.org/work-of-the-fsb/financial-innovation-and-structural-change/crypto-assets-and-global-stablecoins/)|standards-policy · P0 · 专题 / 报告 / 建议|全球加密资产、稳定币政策框架与实施评估。<br>边界：协调性建议和评估，不等于成员国已完成立法。|官方 crypto-assets and stablecoins 页面已读取。|
|[BIS / BCBS / CPMI](https://www.bis.org/publications)|standards-policy · P0 · 出版物 / 委员会标准|央行、代币化、支付基础设施和银行审慎研究/标准。<br>边界：BIS 作者工作论文不等同 BIS 全体立场；BCBS 标准需本地实施；区分论文、标准和试验。|官方 Publications 已读取；tokenisation 文献官方搜索证据支持分类。|
|[IOSCO](https://www.iosco.org/library/pubdocs/pdf/IOSCOPD754.pdf)|standards-policy · P1 · 正式政策报告 / 官网目录候选|证券监管全球协调、加密资产与 DeFi 政策建议。<br>边界：建议面向监管机构；不是直接执法法源，国内落实状态另核。|官方正式报告 URL 搜索索引已核；官网/目录工具访问失败，未实测 PDF 解析。|
|[IMF](https://www.elibrary.imf.org/view/journals/068/2026/001/068.2026.issue-001-en.xml)|standards-policy · P1 · 论文 / 政策报告 / eLibrary|宏观金融、跨境流动、代币化与政策研究。<br>边界：Working Papers/Fintech Notes 常为作者观点；不等同 IMF 执行董事会立场或本地法律。|官方 eLibrary Tokenized Finance 2026 出版物及官方论文免责声明已核；主题入口正文为空。|
|[ESMA](https://www.esma.europa.eu/esmas-activities/digital-finance-and-innovation/markets-crypto-assets-regulation-mica)|regulatory · P0 · MiCA 专题 / 技术标准 / Register|MiCA、CASP、白皮书、监管技术标准与名录。<br>边界：白皮书列入名录不代表监管批准内容；区分 consultation、draft RTS、adopted 与适用日期。|官方 MiCA 页面已读取，白皮书未获主管机构审核/批准的提示明确。|
|[EBA](https://www.eba.europa.eu/regulation-and-policy/asset-referenced-and-e-money-tokens-mica)|regulatory · P0 · MiCA 专题 / 技术标准|MiCA 下 ART/EMT、储备、治理与监管技术标准。<br>边界：EBA 最终草案、委员会采纳及 Official Journal 发布为不同法律阶段。|官方专题搜索索引正文已核；工具 open 返回失败，网页采集待验证。|
|[EUR-Lex](https://eur-lex.europa.eu/eli/reg/2023/1114/oj)|regulatory · P0 · 法律 / Official Journal|欧盟正式法律文本与公报；MiCA 作为代表入口。<br>边界：原始版本与修订合并版本不同；生效日与适用日分开；这是法源不是新闻栏目。|官方 URL 已访问，但返回 JavaScript/反机器人提示，正文未验证；ESMA 官方 Single Rulebook 交叉索引已核。|
|[香港证监会 SFC](https://www.sfc.hk/en/News-and-announcements)|regulatory · P0 · 新闻 / 通函 / 咨询 / 名录|虚拟资产交易平台、基金、托管与投资者保护公告。<br>边界：香港监管范围；持牌实体与品牌/产品不能混同；审批特定产品不等于资产安全保证。|官方 News and announcements 已读取。|
|[香港金管局 HKMA](https://apidocs.hkma.gov.hk/documentation/press-releases/)|regulatory · P0 · 新闻稿 API 文档 / 官网公告|稳定币、银行数字资产、支付与代币化试验一手资料。<br>边界：牌照仅限指定主体与业务；政策咨询、试验和正式制度分别标注。|官方新闻稿 API 文档已读取；网页新闻栏目读取失败；未执行 API 请求。|
|[新加坡 MAS](https://www.mas.gov.sg/news)|regulatory · P0 · News / consultation / directory|DPT、稳定币、机构代币化与执法/牌照公告。<br>边界：研究试点不等于全面许可；需查主体许可证及业务范围。|官方 News 页面已读取，动态列表适配仍需实测。|
|[中国人民银行](https://www.pbc.gov.cn/goutongjiaoliu/113456/113469/index.html)|regulatory · P0 · 新闻 / 通知 / 政策|内地虚拟货币监管、支付、反洗钱与数字人民币官方信息。<br>边界：内地与香港政策不能互套；数字人民币、区块链应用和代币交易区分；多部门文件需保留联署。|官方新闻目录已读取。|
|[英国 FCA](https://www.fca.org.uk/news)|regulatory · P0 · News / consultation / register|加密业务注册、营销、稳定币/市场规则与执法。<br>边界：AML 注册不等于产品背书或完整审慎许可；拟议政策与最终规则分别标注。|官方 News 页面已读取。|
|[日本金融厅 FSA](https://www.fsa.go.jp/en/news/)|regulatory · P1 · 新闻 / 政策 / 名录|加密交换、稳定币、监管改革与执法公告。<br>边界：英文与日文发布时间/细节可能不同；JVCEA 自律规则不是 FSA 法律。|官方 English Press Releases 2026 页面已读取。|
|[Dubai VARA](https://www.vara.ae/en/)|regulatory · P1 · 规则 / 公告 / 名录 / 执法|迪拜虚拟资产规则、牌照、执法与市场通函。<br>边界：迪拜范围不能泛化到整个 UAE；DIFC 等辖区须查各自主管机构。|官方官网与 Enforcement 页面已读取。|
|[瑞士 FINMA](https://www.finma.ch/en/news/)|regulatory · P1 · News / guidance / register|稳定币、托管、数字资产银行与执法官方资料。<br>边界：监管技术中立指引不等于批准任意项目；牌照、sandbox 和产品风险分开。|官方 News 页面已读取。|
|[CME Group Crypto](https://www.cmegroup.com/markets/cryptocurrencies)|first-party-disclosure · P1 · 产品 / 合约 / 市场数据|加密期货/期权合约规格、产品公告、结算与成交数据。<br>边界：自身交易场所数据是一手；不能代表全球全部未平仓/成交或现金 ETF 流。|官方 Cryptocurrencies 页面已读取，.html 跳转无后缀地址。|
|[Circle Transparency](https://www.circle.com/transparency)|first-party-disclosure · P0 · 发行人透明度 / 鉴证|USDC/EURC 发行量、储备披露与鉴证文件入口。<br>边界：发行人披露与第三方鉴证分开；鉴证只覆盖特定时点/范围，不等于所有业务的完整财报审计或未来偿付保证。|官方 Transparency 页面已读取；本文未核验每期报告的会计师签名和鉴证范围。|
|[Tether Transparency](https://tether.to/en/transparency/)|first-party-disclosure · P0 · 发行人透明度 / 储备报告|USDT 等资产储备与发行人披露。<br>边界：自报发行量、储备报告和鉴证不同于完整财报审计；特定时点数据不能证明持续流动性或全部负债覆盖。|官方 Transparency 页面已读取；具体最新鉴证文件范围另核。|
|[BlackRock / iShares IBIT](https://www.ishares.com/us/products/333011/ishares-bitcoin-trust-etf)|first-party-disclosure · P1 · ETF 官方产品 / 法律文件|产品持仓、净值、费用、法律文件与官方 ETF 资料。<br>边界：自身基金资料是一手，产品营销存在发行人利益；AUM 变化包含价格变动，不等于净流入。|官方 IBIT 产品页已读取；未核验所有日更下载内容。|
|[Coinbase SEC Filings](https://investor.coinbase.com/financials/sec-filings/default.aspx)|first-party-disclosure · P1 · Investor Relations / SEC filings|上市公司法定披露、收入、风险和托管业务财务资料。<br>边界：公司提交文件不等于 SEC 为内容背书；审计报表、非 GAAP 与管理层预期需区分。|官方 SEC Filings 列表已读取；EDGAR 原件可用于后续交叉验证。|
|[Strategy](https://www.strategy.com/press)|first-party-disclosure · P1 · 公司 / 市场基础设施公告与法定披露|上市公司 BTC 财库、融资、优先股与财报官方披露。<br>边界：管理层 BTC Yield 等自定义指标不是股东现金收益；持仓/融资新闻需与 SEC 原件核对。|官方 Press archive 已读取，含 Investor Relations 和季度财报。|
|[MARA](https://ir.mara.com/news-events/press-releases)|first-party-disclosure · P1 · 公司 / 市场基础设施公告与法定披露|矿企运营、能源、持币、融资及财报一手披露。<br>边界：仅代表本公司；产量、算力与自定义成本口径需核对，不能代表全网矿业。|官方 IR Press Releases 已读取；页面存在 News RSS 导航，但未测试 feed。|
|[Riot Platforms](https://www.riotplatforms.com/investors/)|first-party-disclosure · P1 · 公司 / 市场基础设施公告与法定披露|矿业、数据中心、财务与公司运营一手披露。<br>边界：区分自有/托管算力、销售持币、非 GAAP 与 audited statements；自身 PR 有利益。|官方 IR 首页已读取并列出 Press Releases、SEC Filings 和 Financial Results。|
|[DTCC](https://www.dtcc.com/insights)|first-party-disclosure · P1 · 公司 / 市场基础设施公告与法定披露|市场基础设施、证券结算与机构代币化一手资料。<br>边界：概念研究、试验、许可和正式生产服务需逐项区分；业务方公告不是全行业监管规则。|官方 /news 跳转 /insights，页面已读取；综合财经栏目需 Web3 过滤。|
|[Securitize](https://investors.securitize.io/overview/)|first-party-disclosure · P1 · 公司 / 市场基础设施公告与法定披露|代币化资产发行/转让基础设施、合作与财务一手披露。<br>边界：发行平台营销不能证明链外权益或资产独立审计；合作意向、上线、规模分别核验。|官方 investor 域名目录与季度财报搜索索引已核；securitize.io/news 读取失败。|

## 钱包、工具与其他基础设施（22个入口）

|来源与原始入口|主题 / 优先级 / 用途|价值与边界|验证|
|---|---|---|---|
|[Ledger](https://www.ledger.com/blog)|钱包与账户 · P1 · editorial|硬件钱包、固件和自有安全研究；博客含 Product、Donjon 栏目<br>边界：硬件厂商立场；不得据自述推断所有固件安全|official_page_read_2026-10-01|
|[Trezor](https://trezor.io/learn)|钱包与账户 · P2 · editorial|硬件钱包操作、安全与产品更新；官方 Learn 页列产品更新栏目<br>边界：教程多于新闻；只选新发布、安全公告和技术变化|official_page_read_2026-10-01|
|[Phantom](https://phantom.com/learn/blog)|钱包与账户 · P1 · editorial|多链消费钱包产品与生态入口<br>边界：教程、市场趋势和推广须分离，非独立项目评级|official_page_read_2026-10-01|
|[Safe](https://www.safe.global/blog)|钱包与账户 · P1 · editorial|多签与智能账户基础设施、集成和产品变化<br>边界：自身产品公告一手；整个生态安全须合约和独立评估|official_page_read_2026-10-01|
|[WalletConnect](https://walletconnect.com/blog)|钱包与账户 · P1 · editorial|钱包连接、支付和网络变更；当前博客含网络和钱包栏目<br>边界：网络交易量为提供方自述；合作公告须另一方交叉验证|official_page_read_2026-10-01|
|[Consensys](https://consensys.io/blog)|开发基础设施 · P2 · editorial|以太坊软件、企业基础设施和公司政策活动<br>边界：与 MetaMask/相关产品存在同集团叙事，不能当两份独立证据|official_page_read_2026-10-01|
|[Foundry](https://www.getfoundry.sh/)|开发基础设施 · P2 · editorial|以太坊开发框架，旧 book.getfoundry.sh 已迁移；建议官方指向仓库 Release<br>边界：本次确认文档入口，未把文档首页当新闻列表或验证具体 Release feed|official_portal_read_publication_entry_pending|
|[Hardhat](https://hardhat.org/)|开发基础设施 · P2 · editorial|智能合约开发框架；官网当前为 Hardhat 3，适合追踪重大工具变更<br>边界：官网和文档已读；正式采集须定位官方仓库/变更日志与版本日期|official_portal_read_publication_entry_pending|
|[IPFS Blog & News](https://blog.ipfs.tech/)|存储与数据 · P1 · editorial|内容寻址与分布式存储技术；官方入口明示 RSS，兼有 Kubo Release<br>边界：博客包含外部生态内容与媒体转引，不能整源 first_party=true|official_page_read_2026-10-01|
|[Arweave](https://arweave.org/)|存储与数据 · P2 · editorial|永久存储生态官方门户，作为后续官方公告锚点<br>边界：本次主页可读但正文很少，具体文章/公告列表和 AO 入口仍待核验|official_portal_read_publication_entry_pending|
|[The Graph](https://thegraph.com/blog/)|存储与数据 · P1 · editorial|链上索引与查询网络官方发布<br>边界：索引数据、查询量和服务商业叙事须区分；自有生态消息优先|official_page_read_2026-10-01|
|[Farcaster](https://farcaster.xyz/)|NFT与消费应用 · P2 · editorial|社交协议官方门户；用于身份与文档锚定<br>边界：本次不是具体动态列表；第三方客户端发帖不能统称协议官方|official_portal_read_publication_entry_pending|
|[Lens](https://lens.xyz/news)|NFT与消费应用 · P2 · editorial|社交网络与开发生态官方新闻页<br>边界：生态作者和官方公告分开；页面读取不代表采集适配完成|official_page_read_2026-10-01|
|[Immutable](https://www.immutable.com/blog)|NFT与消费应用 · P2 · editorial|链游基础设施、游戏上线和合作公告<br>边界：签约/筹备不等于游戏实际上线；玩家指标须独立数据|official_page_read_2026-10-01|
|[Monero Project](https://www.getmonero.org/blog/)|隐私与密码学 · P1 · editorial|隐私协议版本说明、会议记录与漏洞响应；官网列 Releases/Urgent/RSS<br>边界：社区维护项目；发布不等于对匿名强度的全面证明|official_page_read_2026-10-01|
|[Electric Coin Company / Zcash](https://electriccoin.co/blog/)|隐私与密码学 · P2 · editorial|Zcash 相关钱包和隐私工程的一手历史材料<br>边界：本次可见最新文章为2025-12；不能假设代表2026全部现任开发方或唯一官方|official_page_read_2026-10-01|
|[Zama](https://www.zama.org/blog)|隐私与密码学 · P1 · editorial|全同态加密与保密计算；zama.ai/blog 重定向至新域名<br>边界：技术理论、测试结果和实际主网性能必须区分|official_page_read_2026-10-01|
|[Akash Network](https://akash.network/blog/)|DePIN与去中心化AI · P2 · editorial|去中心化云计算与 GPU 资源网络官方技术动态<br>边界：供给不等于实际利用率或营收，客户案例不能作全网指标|official_page_read_2026-10-01|
|[Bittensor](https://www.bittensor.com/)|DePIN与去中心化AI · P2 · editorial|去中心化机器智能网络官方门户<br>边界：本次主页正文有限；子网质量与收益不能仅凭官网，公告/文档入口待补|official_portal_read_publication_entry_pending|
|[Render Network](https://rendernetwork.com/)|DePIN与去中心化AI · P2 · editorial|分布式 GPU/渲染网络官方锚点，官网有生态和开发信息<br>边界：网络官网已核查，具体新闻列表与治理 RNP 路径需采集前确认|official_portal_read_publication_entry_pending|
|[Geth Releases](https://github.com/ethereum/go-ethereum/releases)|客户端与实际实现 · P1 · editorial|客户端代码和发布状态的直接证据；与标准提案、开发者会议形成实现层互证。<br>边界：单个客户端发布不能代表全网完成升级；RC/预发布不写成稳定正式版本。|repository_page_read_and_local_atom_parsed_2026-10-01|
|[Reth Releases](https://github.com/paradigmxyz/reth/releases)|客户端与实际实现 · P1 · editorial|客户端代码和发布状态的直接证据；与标准提案、开发者会议形成实现层互证。<br>边界：单个客户端发布不能代表全网完成升级；RC/预发布不写成稳定正式版本。|repository_page_read_and_local_atom_parsed_2026-10-01|

## 个人专业作者与观察者（56个入口）

|来源与原始入口|主题 / 优先级 / 用途|价值与边界|验证|
|---|---|---|---|
|[Vitalik Buterin](https://vitalik.eth.limo/)|ETH协议与密码学 · P0 · editorial|官网持续发表协议扩容、密码学、隐私与治理原始论述；本次首页可见2026年文章。<br>边界：对自己提出的技术论证有一手价值；个人设想不等于EIP已通过或网络已部署，价格判断无额外权威。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Jameson Lopp](https://blog.lopp.net/)|BTC与自托管 · P0 · editorial|自有博客包含节点性能测试、BIP争论、量子迁移两方分析；官网标明Casa联合创始人及CSO。<br>边界：在节点测试、安全与托管方法上优先；涉及Casa产品或投资标的须披露利益；个人政治观点另行过滤。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Peter Todd](https://petertodd.org/)|BTC协议研究 · P0 · editorial|可读BIP-110代码审查、RBF、CoinJoin、Lightning和OpenTimestamps原始文章。<br>边界：采纳可复核技术论据；BTC/ETH争论和个人立场不能替代代码或规范，协议提案不等于共识。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Matt Corallo / BlueMatt](https://bluematt.bitcoin.ninja/)|BTC与Lightning · P1 · editorial|本人博客说明Bitcoin设计与价值取舍；Spiral官方文章明确将Matt Corallo与TheBlueMatt对应。<br>边界：开发者观点适用于协议与自托管；博客明确意见属于个人；不代表Bitcoin全体开发者。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Adam Back](https://blog.blockstream.com/author/adam-back/)|BTC密码学与产业 · P2 · editorial|Blockstream官方领导页确认联合创始人及CEO、Hashcash发明者；有官方署名技术文章。<br>边界：Hashcash及Blockstream自身技术有一手地位；Liquid、挖矿和公司金融产品存在商业利益；作者页旧文多，更新入口需再测。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Nic Carter](https://niccarter.info/)|BTC研究与宏观 · P1 · editorial|个人站整理论文与署名文章，2026年持续提出Bitcoin量子风险和迁移方案的反方论述。<br>边界：投资者/评论者框架需要复核；不代表Coin Metrics官方数据；争议论断须并列代码研究和不同判断。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Lyn Alden](https://www.lynalden.com/)|货币机制与宏观 · P1 · editorial|自有研究公司官网、长期货币技术论述；自述明确研究与Ego Death Capital投资身份。<br>边界：宏观机制和历史分析有参考价值；宏观预测不是监管事实或资产回报保证；BTC投资与基金利益须披露。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Andreas M. Antonopoulos](https://aantonop.com/)|BTC技术教育 · P2 · editorial|本人网站列技术书籍、公开视频和开放区块链教育材料。<br>边界：优先教育和安全概念；不是当前网络参数或最新版本的唯一依据；书籍/课程商业推广过滤。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Dankrad Feist](https://dankradfeist.de/)|ETH数据可用性与共识 · P0 · editorial|本人About列EIP-4844、DA采样与协议贡献；当前明确在Tempo Labs工作并为EF Protocol Cluster研究顾问。<br>边界：个人意见与Tempo公告须分开；不得继续简写成EF全职现任研究员；顾问/任职/持仓对观点的影响查Disclosures。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Tim Beiko](https://notes.ethereum.org/@timbeiko)|ETH升级与开发会议 · P0 · editorial|Ethereum域下个人HackMD页面是开发协调笔记与会议材料的署名入口。<br>边界：会议安排、议程、讨论有一手性；讨论中的纳入项不等于硬分叉已执行；需与EIPs及客户端发布交叉核对。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Justin Drake](https://blog.ethereum.org/2025/07/31/lean-ethereum)|ETH共识与抗量子研究 · P0 · editorial|EF官网本人署名lean Ethereum愿景，明确提出研究路线并提示观点多样性。<br>边界：愿景和研究是假设与目标；文章自己标注Drake take，不能写成EF正式决议；具体时程须验规范。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Barnabé Monnot](https://barnabemonnot.com/)|机制设计与ETH经济学 · P2 · editorial|个人站及出版列表可核查算法博弈论、密码经济学和历史EF研究身份。<br>边界：本人旧站新闻停留2020年；当前职务不能从旧简介推断。本次未用第三方X镜像的现职介绍作已验证事实。|本人历史站点已读取；当前职务、最新内容入口、X账号锚点及RSS待补验|
|[Ben Edgington](https://benjaminion.xyz/)|ETH共识与技术教育 · P1 · editorial|作者本人站和Upgrading Ethereum技术手册可核对；EF Protocol Consensus团队页当前列External Consultant。<br>边界：书的具体版本可能只到某次升级；须对照现行规范；历史Teku或OP Labs职务不得写成当前职务。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Christine D. Kim](https://christinedkim.substack.com/about)|ETH开发跟踪与研究 · P0 · editorial|本人Substack说明专注BTC/ETH协议发展；Galaxy作者档案保留大量本人ACD会议写作。<br>边界：会议摘要是署名研究而非会议表决；本人About用At Galaxy I led过去式，Galaxy旧作者页VP职位不能视为当前职务。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Dan Robinson](https://www.paradigm.xyz/team/dan-robinson)|DeFi机制与市场结构 · P0 · editorial|官方团队页列GP及研究职责，包含AMM、借贷、链上竞拍与Bitcoin量子保护的署名研究。<br>边界：技术推导和模型可复核；VC被投项目、联合开发及政策主张有利益关系；作者与项目官方公告分开。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Georgios Konstantopoulos](https://www.paradigm.xyz/team/georgios-konstantopoulos)|开发基础设施与EVM · P0 · editorial|官方团队页列Paradigm GP/CTO及Tempo CTO，署名Reth、Alloy、Foundry与扩容研究。<br>边界：工具发布要回到GitHub版本；VC/Tempo双重利益明确标注；架构路线是作者选择，不代表通行标准。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Tarun Chitra](https://www.gauntlet.xyz/team)|DeFi量化风险与研究 · P1 · editorial|Gauntlet团队页当前列CEO；本人arXiv论文涉及链上借贷、质押竞争和intent市场。<br>边界：模型有效性依赖假设与市场数据；公司有风险顾问/金库业务利益；个人站老旧，不用它做实时信源。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Hasu](https://research.flashbots.net/)|MEV与ETH经济学 · P1 · editorial|Flashbots官方研究目录存在本人署名研究；Uncommon Core可核查早期Bitcoin经济研究。<br>边界：Flashbots业务与MEV路线存在利益；Uncommon Core首页包含已过时的作者职务，不能照搬旧简介；需要按署名筛选。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[samczsun](https://samczsun.com/)|合约安全与漏洞研究 · P0 · editorial|本人博客保存漏洞分析和事故响应原始文章，可沿代码/交易重建论证。<br>边界：对具体漏洞研究有专业价值；事件严重性、损失和归因须项目/链上证据复核；不从旧报道推断当前雇主。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[余弦 / Cos](https://github.com/slowmist/Blockchain-dark-forest-selfguard-handbook)|中文安全与反钓鱼 · P0 · editorial_and_hot_signal|慢雾组织官方仓库明示Author Cos@SlowMist Team并链接evilcos；多语言安全手册有明确作者和方法。<br>边界：安全事件初报需复核地址、交易和项目修复；慢雾提供商业安全服务，合作/审计不等于产品绝对安全。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[ZachXBT](https://t.me/s/investigations)|链上调查与反诈骗 · P0 · editorial_and_hot_signal|本人署名Telegram公开调查频道持续链接自身X调查线程，含跨平台调查证据。<br>边界：调查指控是作者调查，不等于司法裁判；逐条复核交易、地址归属与证据链。未验证zachxbt.live归属，排除该仿似域名。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Mudit Gupta](https://mudit.blog/)|合约与钱包安全 · P2 · editorial|本人署名博客有WazirX、Wintermute、Cream、Poly Network等漏洞机制分析。<br>边界：技术分析适用于所审查的实现和时点；初期猜测不能当最终归因；旧文多、当前职位及更新渠道另验。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Taylor Monahan](https://metamask.io/en-GB/news/taylor-monahan)|钱包安全与威胁情报 · P0 · editorial_and_hot_signal|MetaMask官方本人作者页有恶意软件及安全专题。<br>边界：本人技术分析与MetaMask官方事故通告不同；厂商关联和竞品表述需交叉证据；不沿用旧媒体职位。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Hayden Adams](https://blog.uniswap.org/uniswap-v4)|DEX与DeFi产品 · P1 · editorial|Uniswap官方本人署名v4设计文章，作者链接作为个人账号身份锚点。<br>边界：对自己设计的AMM有一手价值；项目利益显著。初始愿景不证明当前产品上线；DAO治理不由创始人个人替代。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Robert Leshner](https://www.superstate.com/about)|借贷与RWA · P2 · editorial|Superstate官方当前列联合创始人及CEO，说明此前联合创立Compound Labs。<br>边界：公司产品设计与历史机制经验可参考；RWA可得性、法域与风险须产品文件核查；不是独立评级。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Andre Cronje](https://andrecronje.info/)|DeFi架构与市场结构 · P1 · editorial|本人规范身份页列Yearn/Keep3r/ve33历史及Flying Tulip、Witnessnet当前工作；Sonic官方声明与其现身份交叉吻合。<br>边界：个人/项目记录有一手性；投资与商业利益高。2026-06退出Sonic董事及常规参与，不能继续写Sonic现任CTO。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Chris Dixon](https://cdixon.org/)|Web3投资与网络经济 · P2 · editorial|个人站与About提供a16z crypto投资身份及网络/所有权长期论述。<br>边界：VC立场和被投组合影响观点；用于投资框架与叙事，不能替代技术规范、采用数据或项目独立调查。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Haseeb Qureshi](https://haseebq.com/)|跨生态投资与机制 · P1 · editorial|本人站当前标题为Dragonfly Managing Partner，有原创加密产品、去中心化与跨生态投资论述。<br>边界：VC持仓/被投关系需跟文披露；年度价格预测降为观点而非新闻事实。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Fred Ehrsam](https://www.paradigm.xyz/team/fred-ehrsam)|加密创业与治理 · P2 · editorial|官方列Paradigm联合创始人及Senior Advisor，旧原创文章讨论治理最小化与周期。<br>边界：本次已核验身份，但最新列表主要旧文；当前重心含Nudge。适合历史机制资料，低频监测；不写成现任GP。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Laura Shin](https://unchainedcrypto.com/about/)|原创采访与行业调查 · P0 · editorial|Unchained官方当前列创始人/CEO、记者及节目主持人，可溯源到完整采访而非转述。<br>边界：采访中嘉宾的主张归嘉宾；节目赞助与媒体内容分开；不是协议官方或资产推荐。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[吴说 / Colin Wu](https://wublock123.com/)|中文与亚洲原创报道 · P0 · editorial|中文官网、英文站、Substack和官方Linktree互链，提供亚洲监管、交易所、矿业原创采访及报道。<br>边界：Colin Wu个人与吴说编辑团队内容区分署名；媒体独家需第二证据；禁止把报道当官方政策。官网版权明确禁止未许可转载/复制/商用，须授权或仅合规链接引用。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Mindao Yang](https://medium.com/@mindao.yang)|中文DeFi与稳定币机制 · P1 · editorial|本人Medium自述dForce Founder，团队在Arbitrum官方论坛提案列其核心贡献者及创始人；有本人协议/事件署名。<br>边界：dForce相关内容利益直接；跨协议观点须数据/规范复核。Medium旧文多，本次不把已知X昵称猜作已验handle。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Dovey Wan](https://medium.com/@doveywan)|中文与跨境投资研究 · P2 · editorial|本人Medium在Primitive Ventures刊物下署名金融化信念系统及团队研究，并自述创始人身份。<br>边界：投资机构与被投组合有利益；自述/署名可验但本次官网读取失败，现任职务和实时账号仍需官方二次锚点。|本人公开Medium署名及创始人自述已读取；机构官网不可读，当前职务及X待补验|
|[Jason Kam / MapleLeafCap](https://www.folius.ventures/)|中文Web3产品与投资 · P1 · editorial|Folius官方Team直接把Founder链接到Mapleleafcap，提供中文/英文文献入口。<br>边界：官方声明基金存在未披露的非私募敞口；研究观点与持仓须分开，不能把基金持仓文章当独立项目评级。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[孟岩 / Mike Meng](https://eips.ethereum.org/EIPS/eip-3525)|中文通证设计与标准 · P2 · editorial|ERC-3525最终规范的作者名单含Mike Meng；公开中文材料将其与孟岩/Solv对应，适合标准机制和中文长文线索。<br>边界：规范作者身份的权威只适用于标准与设计；Solv相关产品有直接利益；中文名映射辅以媒体资料，不宣称本次现任职务已验。|EIP作者一手锚点已读取；中文名映射为公开媒体/署名辅助；持续个人发布入口与X待补验|
|[Molly White](https://www.mollywhite.net/)|反方研究与政治资金追踪 · P0 · editorial|个人站列Citation Needed、Web3 is Going Just Great、Follow the Crypto及本人调查写作，提供行业风险的反方视角。<br>边界：批判性选题有选择偏差；事件列表不等于整个行业失败；事实判断回到法院文件、监管原件与数据。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Dan Boneh](https://crypto.stanford.edu/~dabo/pubs/pubs.html)|密码学与学术原始研究 · P0 · editorial|Stanford官方本人页确认计算机科学及电气工程教授、计算机安全实验室联合负责人；论文目录与区块链/密码学课程为原始研究入口。<br>边界：权威在应用密码学、安全证明及教学；论文假设和证明范围不能外推到部署安全或代币回报，课程不等于项目背书。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Tim Roughgarden](https://timroughgarden.org/chron.html)|机制设计与学术原始研究 · P0 · editorial|署名论文目录含交易费机制、PoS共识、PBS、AMM及2026研究；本人当前页列IAS数学教授、Columbia休假教授与a16z crypto研究负责人。<br>边界：机制分析须保留数学假设；与a16z机构存在利益关联；论文结果不自动证明某实现安全或经济长期成立。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Ari Juels](https://www.arijuels.com/)|密码学与MEV学术研究 · P1 · editorial|本人学术页确认Cornell Tech教授、IC3联合创办/负责人及Chainlink Labs首席科学家；Flash Boys 2.0有正式作者署名。<br>边界：学术成果适用于论文问题；Chainlink任职构成明确项目利益，研究与产品推广分开；身份页须再定位论文更新列表。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Phil / Philip Daian](https://research.flashbots.net/)|MEV与交易排序研究 · P0 · editorial|Flash Boys 2.0正式第一作者；Flashbots官方研究目录有其2025署名Defining Geographic Decentralisation，Ari Juels学术页链接其本人及Flashbots去向。<br>边界：采集需按作者过滤，不能把整站归为其作品；MEV组织立场和商业利益须披露，本次不据旧学术页断言当前职称。|论文署名和官方2025研究目录已读；pdaian.com本次工具不能读取；当前职称与个人X未验|
|[Gavin Wood](https://gavwood.com/)|多链架构与Polkadot · P1 · editorial|本人网站连接Yellow Paper、Polkadot原始提案与技术经历；为Ethereum形式规范及多链设计的作者原始入口。<br>边界：历史创始经历可核；站点较静态，不据此推定今日公司职务；Polkadot/JAM路线有生态利益，技术主张须比对规范及实现。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Anatoly Yakovenko](https://solana.com/solana-whitepaper.pdf)|Solana共识与性能架构 · P2 · editorial|Solana官网托管本人署名原始白皮书；官网Proof of History文章有其完整技术说明与Solana Labs联合创始人身份。<br>边界：白皮书是历史技术设计，不能当成当前Agave/Alpenglow规范或实测TPS；Solana创始人立场须与客户端数据交叉；个人持续内容入口待补。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Mert Mumtaz](https://www.helius.dev/about)|Solana基础设施与产品 · P2 · editorial|Helius官网确认现任联合创始人及CEO，说明其工程经历与当前负责方向；可用于核对其原始访谈和基础设施经验。<br>边界：身份入口已验，但Helius团队博客不能全归到其本人；与Solana基础设施业务有直接利益；个人署名列表/X需另验，先取访谈与有署名原件。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Jesse Pollak](https://www.ycombinator.com/blog/author/jesse-pollak)|L2与Base产品方向 · P2 · editorial|YC官方作者目录保留其联合署名YC x Coinbase RFS；Coinbase官方2024业绩电话会议涉及其Base及Wallet管理职责，构成原始身份与表述锚点。<br>边界：2024管理角色仅为历史锚点，当前职务待官网更新；YC合作署名不是全部个人作品；Base/相关创业投资有商业立场，不把生态愿景当增长事实。|YC作者页及Coinbase官方历史电话会议原件可读；未核2026现任头衔、个人持续渠道与X|
|[Arthur Hayes](https://cryptohayes.substack.com/)|宏观与市场叙事 · P3 · hot_signal_only|本人Crypto Trader Digest持续长文；自述Maelstrom CIO及BitMEX前CEO。<br>边界：可研究衍生品和流动性框架；价格/时点预测和谈及持仓仅算观点，不能给新闻自动背书。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Cobie](https://cobie.substack.com/about)|市场结构与代币批评 · P3 · hot_signal_only|本人Substack及Paradigm官方Advisor身份可核查。<br>边界：讽刺、匿名爆料、持仓与顾问关系需隔离；单条爆料需原始证据后再入稿。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[David Hoffman](https://www.bankless.com/author/david-hoffman)|媒体主持与生态叙事 · P3 · editorial_interviews_only|Bankless本人作者页及节目，含持仓/天使投资/顾问披露。<br>边界：明确观点内容和赞助；官方披露页本身可能滞后，不能推断实时持仓；采访可用，资产观点隔离。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Ryan Sean Adams](https://www.bankless.com/author/ryan)|媒体主持与生态叙事 · P3 · editorial_interviews_only|Bankless本人作者页可核查署名及商业利益披露。<br>边界：多个被投/顾问关系，个人观点与独立采访区分；不把同一Bankless团队两名主持算两个独立证据。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Anthony Sassano](https://thedailygwei.substack.com/about)|ETH教育与社区观点 · P3 · hot_signal_only|The Daily Gwei本人刊物About及项目报告中的创始人身份可核查。<br>边界：ETH生态立场强；技术解释需对照规范；旧thedailygwei.com已停放，不采集该域。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[Evan Van Ness](https://weekinethereum.substack.com/)|ETH社区与历史周报 · P3 · manual_observation_only|本人2025-01-01公告Week in Ethereum已结束；Substack现有个人内容。<br>边界：旧周报不作活跃自动信源；现有收益/交易推荐与历史开发周报不是同一编辑产品。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[愉悦 / Yuyue](https://www.binance.com/en-BH/square/profile/yuyue_chris)|中文链上交易与情绪 · P3 · hot_signal_only|公开自发表Square页面可观察中文叙事、空投及交易讨论。<br>边界：自报回报/排名不作为能力证据；利益和地址归属未系统验证。只作热点线索，不升格权威。|公开自发表页面已检索；跨平台本人身份链、X与实盘数据未验|
|[Haotian / 链上观](https://www.panewslab.com/zh/articles/sb40q2ni4rat)|中文技术与商业解读 · P3 · hot_signal_only|本人受访自述研究经历，PANews有持续署名技术/产品长文。<br>边界：这是作者观点与采访自述；历史PeckShield/Amber职位未独立向雇主确认，项目推荐过滤，技术主张回到代码/论文。|本人受访自述与多篇署名可读；当前职务/商业关系/X身份锚点待补验|
|[0xTodd](https://www.gate.com/news/detail/17777767)|中文质押与资产机制 · P3 · identity_verification_required|2026访谈署名及受访者介绍可发现EBunker/Nothing Research研究线索。<br>边界：此次只有访谈转载，不能证实现任职务/个人账号；不使用同名空GitHub作为身份锚点；暂不接入采集。|仅采访转载可检索；官方任职/本人入口/X身份锚点未验|
|[神鱼 / 毛世行](https://www.cobo.com/zh/about)|中文托管与矿业 · P3 · editorial_interviews_only|Cobo官网当前列联合创始人及CEO，并说明F2Pool共同创立经历。<br>边界：公司历史与托管设计可作一手采访；收益策略、产品推广有直接利益；个人X入口未验证。|已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测|
|[王超 / Wang Chao](https://www.techflowpost.com/en-US/article/19362)|中文DAO与Crypto-AI · P3 · identity_verification_required|2024完整访谈保存本人关于Metropolis DAO及投资机制的自述。<br>边界：采访为历史身份锚点，当前角色/官方个人入口未验；DAO投资偏好是个人意见，并非DAO官方立场。|本人访谈历史自述已检索；现任身份、个人渠道及X待补验|
|[Willy Woo / Woobull](https://woobull.com/)|BTC链上模型与市场 · P3 · identity_verification_required|可读Woobull博客/模型站，适合补充Bitcoin链上定价假设。<br>边界：指标定义、模型回测与实时个人账号需补验；投资价格判断与链上原始数据严格分开；目前仅候选。|Woobull网站可读；本次未完成个人身份链及最新数据/模型准确性验证|

