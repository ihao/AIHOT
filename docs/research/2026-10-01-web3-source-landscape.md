# 9BTC：Web3 权威官方与专业 KOL 信源深度调研

> 接入更新：按站长后续授权，生产已新增 88 个验证通过的信源并首次入库 254 条，生产合计 94 源。本文以下保留调研时的判断；最新状态和采集边界见[生产扩充验收报告](2026-10-01-production-source-expansion.md)。

调研日期：2026-10-01（北京时间）。本文件是研究结论与接入建议；生产仍以实际后台和 `industry/sources.json` 为准。完整目录、分类数量和本机采集实测见下文及结构化登记表。

## 1. 核心判断

9BTC 应建立“当事方与正式文件提供事实、独立数据与安全研究校验、专业 KOL 解释机制、媒体与大众账号发现线索”的信源组合。单靠知名账号或项目官方都不能获得完整、可信的行业图景。

目前六源已覆盖 Bitcoin Core、Ethereum Foundation、Coin Metrics、Chainalysis、PANews 和 SEC；明显缺口是 **Solana及其他生态、DeFi治理、稳定币与RWA披露、独立安全研究、亚洲与欧洲监管，以及原始技术研究和专业作者**。扩展应先补这些不同证据类型，再增加同类新闻数量。当前状态依据[本地配置](../../industry/sources.json)和[10月1日线上验收记录](2026-10-01-live-acceptance.json)，本调研未重新访问生产后台。

“所有有影响力且权威”不是可永久穷尽的集合：生态、机构归属、域名、作者岗位和发布渠道持续变化。此报告覆盖主要协议、技术标准、基础设施、数据/安全/研究机构、主要监管辖区和专业作者；对尚未查完的辖区与生态列明缺口，不把知名度、代币价格或一条搜索结果当权威证明。

这里的“推荐”和 P0/P1/P2 是编辑判断。研究没有对每人的粉丝量、转发量、协议市场份额做统一实时排名，因此不宣称这是一张经过量化验证的全球影响力排行榜。

## 2. 如何判断影响力与权威性

|维度|纳入证据|不足时如何处理|
|---|---|---|
|身份可追溯|官方域、个人网站、机构署名页、官网到社交账号的外链|同名账号和蓝标不能单独确认身份；暂不进入信任名单|
|与事项的直接关系|协议维护、正式提案、发行人披露、法定监管职责、原始研究|项目创始人对自己项目是一手，对他链/宏观只是观点|
|专业影响范围|公开代码/规范/论文、参与关键系统、持续研究、行业基础数据|大众传播与专业贡献分开描述；不以粉丝数代替准确性|
|可复核程度|链接原始文件、合约/交易、数据方法、时间窗和作者|匿名爆料、图表无口径、无原始链接只能作为线索|
|持续获取能力|真实RSS/API/发布列表、日期与链接、内容连续性|官网可读不等于可采集；停更周报、页面壳和付费内容单列|

例如，Electric Capital 公开了开源仓库发现、分类、去重与开发者统计方法，因此适合核验开发者活动；它自己也明确该方法主要覆盖开源仓库，不能用作整个行业收入或用户数。[方法说明](https://www.developerreport.com/about)

L2BEAT 的 Stage 框架用于描述 rollup 的成熟度与信任最小化，适合核查升级权限和安全假设，不应被改写为资产收益或绝对安全排名。[框架原文](https://l2beat.com/stages)

## 3. 五类证据的使用规则

|证据类别|适合回答|不能据此直接得出的结论|9BTC建议|
|---|---|---|---|
|官方项目/公司|该团队宣布、发布、支持、停止什么|已经被全部节点接受；合作方也确认；营销指标是真实全行业数据|重大公告优先；逐篇核对阶段与利益关系|
|标准/开发协调/治理|提出什么、讨论什么、表决什么|提案已实施；基金会代表全社区；论坛任何作者都是官方|保留作者，区分草案、投票、执行和主网激活|
|监管/司法/正式披露|特定辖区规则、执法、牌照、申报文本|全球通用法律；指控已定罪；监管为资产或申报内容背书|回到正式文件与适用主体；新闻稿作为入口|
|数据/安全/研究机构|按明确方法观察到的指标、漏洞、风险与模型结论|模型标签是真实身份；审计保证未来安全；预测是事实|独立交叉核验，保留版本、范围、样本和修订|
|个人KOL|本人原始观点、机制解释、技术贡献、自身项目动态|个人代表整个机构；转述即一手；价格预测有确定性|原创专业长文可入研究流；短帖优先用作线索/讨论信号|

重要事件应追踪状态链：**研究设想 → 正式提案 → 投票/协调结果 → 代码或合约执行 → 主网/业务实际生效**。同一机构的官网、创始人X和旗下博客通常不是三份独立证据。机构转载同一通讯社稿件，也不能人为增加事件热度。

## 4. 优先关注的官方与机构组合

|领域|优先来源|为什么值得放在核心组合|
|---|---|---|
|BTC/ETH技术|Bitcoin Core、BIPs、Bitcoin Optech、EF Blog、EIPs、Ethereum Research、All Core Devs、客户端Releases|兼顾正式发布、开发前沿和实际实现；Optech 明确为独立技术编辑源|
|L1/L2与模块化|Solana News/Status、Arbitrum、Optimism、Base、Starknet、ZKsync、Sui、Aptos、BNB Chain、Avalanche、Celestia；以L2BEAT校验风险|补齐既有Ethereum偏重；各网络升级与故障须看具体链|
|DeFi与治理|Aave、Uniswap、Sky、Lido的治理与开发方公告；Morpho、Curve、Compound、Pendle、Hyperliquid、Jupiter|治理参数、机制变化和实际产品采用的直接证据|
|稳定币/RWA/支付|Circle公告与透明度、Tether公告与透明度、Paxos、Ondo、Centrifuge、Maple；RWA.xyz方法与数据|区分产品宣布、储备/鉴证和底层法律权利，减少概念炒作|
|跨链/MEV/验证|Chainlink、Pyth、LayerZero、Wormhole、Eigen Labs、Flashbots|关键基础设施、安全假设与交易机制的一手材料|
|链上数据/市场结构|Coin Metrics、Kaiko、Artemis、DefiLlama、Token Terminal、Glassnode、Electric Capital、L2BEAT|核验市场结构、费用收入、开发活动和真实风险，防止把地址数当用户|
|安全与犯罪|SlowMist、BlockSec、Trail of Bits、Immunefi、OtterSec、Chainalysis、TRM、Elliptic|覆盖漏洞机制、攻击复盘和资金归因；初报与结案分别处理|
|深度技术/机构研究|Paradigm、a16z crypto、Galaxy、CoinShares、Delphi、Fidelity Digital Assets|原始机制研究和机构视角；持仓、客户和委托研究利益须注明|
|监管与法源|SEC、CFTC、OFAC、SFC、HKMA、MAS、ESMA、EBA、EUR-Lex、人民银行；FATF/FSB/BIS/IOSCO辅助|既有SEC不足以覆盖亚洲、欧洲和跨境合规，建议与法律要分开|
|钱包/开发/隐私/消费|MetaMask、Safe、Ledger、Trezor、WalletConnect、OpenZeppelin、IPFS、Filecoin、ENS、Monero、Zama等|覆盖用户资产安全、关键工具升级以及金融以外的Web3应用|

上表是优先组合而非启用清单，具体官方入口和核查证据逐项列在完整目录。Dune 和 CryptoQuant Quicktake 这类平台有用户投稿，必须精确到作者、查询或文章；整个平台不宜设为统一一手来源。


<!-- PRIORITY SHORTLIST START -->
### 第一轮20个互补入口

以下20个入口是采样验收建议，均来自已登记目录；不是已启用名单。其余来源保留在完整库。此前已接入的六源继续作为基线；本表侧重补齐新证据类型。

|入口|补齐的价值|
|---|---|
|[Solana 官方新闻](https://solana.com/news)|网络升级、开发与应用生态的一手公告|
|[Ethereum Research](https://ethresear.ch/)|扩容、共识、密码学与经济机制的前沿讨论|
|[Aave 治理论坛](https://governance.aave.com/)|借贷参数、抵押品、风险评估、部署与 GHO 讨论|
|[Uniswap 治理论坛](https://gov.uniswap.org/)|费率、跨链部署、治理与资金提案|
|[Lido Governance](https://research.lido.fi/)|流动性质押、节点运营、安全和协议治理|
|[Sky 治理论坛](https://forum.skyeco.com/)|稳定币治理、风险参数、抵押品与 RWA 讨论|
|[Flashbots Writings](https://writings.flashbots.net/)|MEV、PBS、区块构建、TEE、隐私与交易执行研究|
|[Circle Blog](https://www.circle.com/blog)|USDC、EURC、CCTP、支付与产品支持变更|
|[Circle Transparency](https://www.circle.com/transparency)|USDC/EURC 发行量、储备披露与鉴证文件入口。|
|[Tether Transparency](https://tether.to/en/transparency/)|USDT 等资产储备与发行人披露。|
|[L2BEAT](https://l2beat.com/)|L2 技术、安全假设、去中心化阶段与风险资料。|
|[SlowMist / 慢雾](https://slowmist.medium.com/)|中文生态安全事件、攻击复盘、链上追踪与防骗。|
|[BlockSec](https://blocksec.com/blog)|攻击路径、交易分析、DeFi 防护与安全复盘。|
|[Immunefi](https://immunefi.com/blog/)|漏洞赏金、攻击损失报告与研究者披露。|
|[美国 CFTC](https://www.cftc.gov/PressRoom/PressReleases)|衍生品、商品、预测市场与执法一手发布。|
|[香港证监会 SFC](https://www.sfc.hk/en/News-and-announcements)|虚拟资产交易平台、基金、托管与投资者保护公告。|
|[香港金管局 HKMA](https://apidocs.hkma.gov.hk/documentation/press-releases/)|稳定币、银行数字资产、支付与代币化试验一手资料。|
|[新加坡 MAS](https://www.mas.gov.sg/news)|DPT、稳定币、机构代币化与执法/牌照公告。|
|[ESMA](https://www.esma.europa.eu/esmas-activities/digital-finance-and-innovation/markets-crypto-assets-regulation-mica)|MiCA、CASP、白皮书、监管技术标准与名录。|
|[Paradigm](https://www.paradigm.xyz/writing)|机制设计、AMM、MEV、技术与政策原始研究。|

<!-- PRIORITY SHORTLIST END -->
## 5. 专业KOL的选择与使用

最有价值的作者应按“能解释哪一个机制”选择：协议研究、密码学、MEV、DeFi机制、链上取证、数据方法、市场结构与中文一手采访。不能把同一个人对所有主题都标成权威。

建议分成三种订阅：

1. **原创研究流**：个人站、署名论文、技术博客和长文。可作为独立文章进入分析，但应保留作者和推导假设。
2. **当事方动态**：创始人或研究者谈自己直接参与的项目。能证明本人声明；重大产品或决策回官方材料确认。
3. **讨论与发现流**：强商业立场、宏观判断、热门短帖、媒体采访。先作为 `hot_signal` 或线索，不让转发与喊单独立触发事实新闻。

个人名单包含重点研究作者和条件观察者，详见[个人KOL研究](2026-10-01-web3-kol-sources.md)。身份、岗位、X账号和旧专栏是否停更需持续核对；本轮未登录X读取实时粉丝数、完整近期时间线或平台全量关系图。无法用这些指标证明“当前全球最受关注”。

中文来源特别保留慢雾/BlockSec的原创安全材料、具原始采访和明确署名的吴说内容、专业研究者的原文；中文聚合转载仅用于发现，不把语言本身作为降低证据要求的理由。PANews继续按媒体源使用，不因其包含项目投稿而升级为整源官方一手。


<!-- AUTHOR SHORTLIST START -->
### 原创作者重点池

下面16人优先用于研究材料选择，按专业互补排列；并未对粉丝或互动量排序。原始论述、本人声明和最终事实各自标注。完整个人目录还包含其他重点作者和条件观察者。

|作者|专业范围 / 入口类型|主要边界|
|---|---|---|
|[Vitalik Buterin](https://vitalik.eth.limo/)|ETH协议与密码学 / blog|对自己提出的技术论证有一手价值；个人设想不等于EIP已通过或网络已部署，价格判断无额外权威。|
|[Jameson Lopp](https://blog.lopp.net/)|BTC与自托管 / blog|在节点测试、安全与托管方法上优先；涉及Casa产品或投资标的须披露利益；个人政治观点另行过滤。|
|[Peter Todd](https://petertodd.org/)|BTC协议研究 / blog|采纳可复核技术论据；BTC/ETH争论和个人立场不能替代代码或规范，协议提案不等于共识。|
|[Dankrad Feist](https://dankradfeist.de/)|ETH数据可用性与共识 / blog|个人意见与Tempo公告须分开；不得继续简写成EF全职现任研究员；顾问/任职/持仓对观点的影响查Disclosures。|
|[Tim Beiko](https://notes.ethereum.org/@timbeiko)|ETH升级与开发会议 / notes|会议安排、议程、讨论有一手性；讨论中的纳入项不等于硬分叉已执行；需与EIPs及客户端发布交叉核对。|
|[Justin Drake](https://blog.ethereum.org/2025/07/31/lean-ethereum)|ETH共识与抗量子研究 / authored-article|愿景和研究是假设与目标；文章自己标注Drake take，不能写成EF正式决议；具体时程须验规范。|
|[Christine D. Kim](https://christinedkim.substack.com/about)|ETH开发跟踪与研究 / newsletter|会议摘要是署名研究而非会议表决；本人About用At Galaxy I led过去式，Galaxy旧作者页VP职位不能视为当前职务。|
|[Dan Robinson](https://www.paradigm.xyz/team/dan-robinson)|DeFi机制与市场结构 / author-directory|技术推导和模型可复核；VC被投项目、联合开发及政策主张有利益关系；作者与项目官方公告分开。|
|[Georgios Konstantopoulos](https://www.paradigm.xyz/team/georgios-konstantopoulos)|开发基础设施与EVM / author-directory|工具发布要回到GitHub版本；VC/Tempo双重利益明确标注；架构路线是作者选择，不代表通行标准。|
|[samczsun](https://samczsun.com/)|合约安全与漏洞研究 / blog|对具体漏洞研究有专业价值；事件严重性、损失和归因须项目/链上证据复核；不从旧报道推断当前雇主。|
|[余弦 / Cos](https://github.com/slowmist/Blockchain-dark-forest-selfguard-handbook)|中文安全与反钓鱼 / repository|安全事件初报需复核地址、交易和项目修复；慢雾提供商业安全服务，合作/审计不等于产品绝对安全。|
|[ZachXBT](https://t.me/s/investigations)|链上调查与反诈骗 / telegram-public|调查指控是作者调查，不等于司法裁判；逐条复核交易、地址归属与证据链。未验证zachxbt.live归属，排除该仿似域名。|
|[Taylor Monahan](https://metamask.io/en-GB/news/taylor-monahan)|钱包安全与威胁情报 / author-directory|本人技术分析与MetaMask官方事故通告不同；厂商关联和竞品表述需交叉证据；不沿用旧媒体职位。|
|[吴说 / Colin Wu](https://wublock123.com/)|中文与亚洲原创报道 / media-and-newsletter|Colin Wu个人与吴说编辑团队内容区分署名；媒体独家需第二证据；禁止把报道当官方政策。官网版权明确禁止未许可转载/复制/商用，须授权或仅合规链接引用。|
|[Mindao Yang](https://medium.com/@mindao.yang)|中文DeFi与稳定币机制 / author-directory|dForce相关内容利益直接；跨协议观点须数据/规范复核。Medium旧文多，本次不把已知X昵称猜作已验handle。|
|[Molly White](https://www.mollywhite.net/)|反方研究与政治资金追踪 / blog|批判性选题有选择偏差；事件列表不等于整个行业失败；事实判断回到法院文件、监管原件与数据。|

<!-- AUTHOR SHORTLIST END -->
## 6. 接入顺序与成本控制

**第一步：从研究库中选约20个新增入口做采集样本验收。** 优先补足 Solana、DeFi治理、安全、稳定币、亚洲/欧洲监管和技术研究，利用本次已成功解析的RSS减少适配工作；P0来源若只有文档或数据平台，应作为证据核验入口，而非强行转成新闻流。

**第二步：扩展重点作者。** 先取约10–15名互补的专业作者，优先个人RSS/长文，X以少量账号搜索补时效。现项目已有 `x_search` / SocialData 路径，按请求计费；技术路径存在不代表本轮已接通、已授权或已完成所有人的时间线验收。[现有采集类型说明](../sources.md)

**第三步：覆盖长尾与低频正式披露。** 多辖区监管、财报、矿业、ETF持仓、密码学论文和消费应用按主题补齐。年度报告优先级可以高，但抓取频率低；不要让同集团转述、产品营销和普通教程挤占模型预算。

现有10月1日验收记录中模型共享预算为每分钟10次、每小时60次、滚动24小时200次；这是此前验收时的站点配置，本调研未确认现在是否调整。新增几十或上百源时，先测日新增、重复率、过滤比例、核验调用数、文章发布时间和队列延迟，不能假定原预算足以维持时效。[验收记录](2026-10-01-live-acceptance.json)

本建议保持全自动运营目标：通过系统预筛、独立证据核验和发布门禁控制风险。因证据不足而暂不公开的条目可以保留为内部线索；不恢复已取消的日常人工审核要求。

## 7. 每个源启用前的具体验收

本调研只涉及公开只读获取，没有新增生产来源、调用付费社交API或启动模型采集任务。后续从候选转成站点配置时，至少完成：

- 从官方站或作者身份锚点确认入口所有权；外部平台同名账户不自动认定。
- 用实际EU采集器读取最近样本，检查条目日期、正文、原文链接、分页、条件请求和重复。
- 论坛按作者/分类/提案状态筛选；GitHub过滤无关提交、机器人和预发布版本，不能把RC写成正式版。
- 对模型处理后的主体、数字、链、事件阶段和出处做样本验证；利益冲突和观点保留归属。
- 摘要+原文链接为默认；付费报告、数据库、图表、图片和全文各有独立许可边界。
- 记录稳定性、内容量、调用预算和发布结果；确认本源用途是 `editorial`、`hot_signal` 还是内部证据入口。

RSS解析成功证明该时点返回了可解析条目，不证明长期稳定、每篇正文可读、身份正确或适合自动发布。官网返回HTTP 200但内容是HTML也不能当RSS成功；具体实测结果及异常入口见下文。

## 8. 研究方法与本轮限制

使用 agent-reach 的公开网页搜索/网页读取/RSS路由，并使用 research 技能分工核对协议、机构与个人来源。Exa只读搜索经网络授权后返回结果；官方网页通过web工具读取；RSS用agent-reach现有环境的feedparser直接解析。

没有登录社交平台、进入会员全文或购买数据服务。部分网页只能取得页面壳，部分正式文档仅取得官方搜索索引/交叉索引，目录已逐项保留这些限制。一次本机TLS错误、403、404或500不能证明来源全球不可用，更不能覆盖实际EU环境的检查结果。

本报告没有用泛泛的“全球Top KOL”营销榜单代替身份与专业产出证据，也没有将采集测试或候选优先级写成生产启用授权。

<!-- GENERATED RESEARCH APPENDIX -->
## 9. 本次覆盖规模与成果

四份专题清单原始 **238条**，合并8条重复登记后形成 **230条信源记录、229个不同入口URL**。其中个人部分为 **44名专业候选、12名条件观察者**。不同作者可以共享机构研究列表，人物记录仍分别保留。机构不同公告/治理/披露渠道可分别登记；部分是核验或历史背景入口，不是实时新闻流。

|材料|规模与用途|
|---|---|
|[协议、标准与治理](2026-10-01-web3-official-protocol-sources.md)|82条原始记录；逐源证据与限制|
|[机构、监管与披露](2026-10-01-web3-institutional-sources.md)|70条原始记录；逐源证据与限制|
|[钱包、工具与其他基础设施](2026-10-01-web3-infrastructure-sources.md)|30条原始记录；逐源证据与限制|
|[个人专业作者与观察者](2026-10-01-web3-kol-sources.md)|56条原始记录；逐源证据与限制|
|[合并总目录](2026-10-01-web3-source-catalog.md)|230条信源记录、229个不同URL；可逐项阅读全部名单|
|[机器登记表](2026-10-01-web3-source-catalog.json)|可供后续筛选；非生产导入配置|

## 10. RSS与Atom实际测试

本机只读请求 **30个不同候选端点**，22个能解析。排除一个未建立正确发布者身份且只含2021旧条目的吴说近似地址后，**21个匹配本研究来源的候选feed解析到日期和原文链接**；其中Electric Coin Company有解析警告。其余7个请求失败、1个返回HTML而非feed。成功数量不等于新增生产源数量。

|已匹配身份/来源的可解析入口|条目数|解析警告|最新首条时间（来源原字段）|
|---|---|---|---|
|[ethereum-foundation](https://blog.ethereum.org/en/feed.xml)|640|无|Mon, 28 Sep 2026 00:00:00 GMT|
|[coin-metrics](https://coinmetrics.substack.com/feed)|20|无|Tue, 29 Sep 2026 13:02:18 GMT|
|[chainalysis](https://www.chainalysis.com/blog/feed/)|10|无|Wed, 30 Sep 2026 20:08:34 +0000|
|[panews](https://www.panewslab.com/rss.xml?lang=zh&type=NORMAL)|100|无|Thu, 01 Oct 2026 03:36:00 GMT|
|[sec](https://www.sec.gov/news/pressreleases.rss)|25|无|Wed, 30 Sep 2026 14:30:01 -0400|
|[ethresearch](https://ethresear.ch/latest.rss)|30|无|Mon, 28 Sep 2026 01:09:06 +0000|
|[ethereum-magicians](https://ethereum-magicians.org/latest.rss)|30|无|Wed, 30 Sep 2026 19:14:52 +0000|
|[aave-forum](https://governance.aave.com/latest.rss)|30|无|Wed, 30 Sep 2026 15:11:10 +0000|
|[uniswap-forum](https://gov.uniswap.org/latest.rss)|30|无|Fri, 18 Sep 2026 14:39:50 +0000|
|[lido-forum](https://research.lido.fi/latest.rss)|30|无|Wed, 30 Sep 2026 23:40:48 +0000|
|[arbitrum-forum](https://forum.arbitrum.foundation/latest.rss)|30|无|Wed, 30 Sep 2026 21:39:07 +0000|
|[optimism-forum](https://gov.optimism.io/latest.rss)|30|无|Thu, 24 Sep 2026 07:31:44 +0000|
|[slowmist](https://slowmist.medium.com/feed)|10|无|Wed, 23 Sep 2026 06:33:17 GMT|
|[ipfs](https://blog.ipfs.tech/index.xml)|27|无|Tue, 25 Aug 2026 00:00:00 GMT|
|[wublock-official](https://wublock.substack.com/feed)|20|无|Wed, 30 Sep 2026 10:53:52 GMT|
|[monero](https://www.getmonero.org/feed.xml)|20|无|2026-07-21T00:00:00+00:00|
|[electric-coin](https://electriccoin.co/feed/)|12|有|Thu, 04 Dec 2025 18:08:28 +0000|
|[solana-blog-candidate](https://solana.com/news/rss.xml)|20|无|Wed, 30 Sep 2026 19:17:00 GMT|
|[ethereum-client-geth](https://github.com/ethereum/go-ethereum/releases.atom)|10|无|2026-09-30T11:48:08Z|
|[ethereum-client-reth](https://github.com/paradigmxyz/reth/releases.atom)|10|无|2026-09-28T12:45:27Z|
|[bitcoin-core-github](https://github.com/bitcoin/bitcoin/releases.atom)|10|无|2026-09-18T14:30:08Z|

特别需要避免的错误：

- `https://blog.chain.link/feed/`返回200但重定向到HTML博客、0条；必须重新适配网页或另找经过验证的feed。
- `wublockchain.substack.com/feed`虽然可解析，但没有在本研究建立吴说本人互链，只有一条2021旧内容，排除。真正经身份链核对的候选是`wublock.substack.com/feed`，本次20条。
- Bitcoin Core官网feed、Optech、Vitalik、Unchained本机出现TLS EOF；Glassnode旧feed为403、Rekt候选为500、Uniswap猜测路径为404。仅记录本次失败，不归因于来源永久停用。
- Atom中的预发布/RC需要过滤，论坛feed中的一般讨论需要作者、分类与状态识别。日期齐全不等于文章今天发布。

完整请求时间、响应类型、重定向、条目数、日期/链接数量及两个样本标题保存在[实测JSON](2026-10-01-web3-feed-probes.json)，不保存文章全文。未进行EU采集器和自动发布验收。

## 11. 尚待补齐的范围

更广泛的地区法源（加拿大、澳大利亚、韩国、印度、巴西、台湾及美国州级监管）、法院/司法部原件、更多支付与托管机构、密码学学术会议，以及不同生态的独立开发者和本地语种作者，仍有增补空间。已登记但只读到页面壳、历史文献、一次采访或本人自述的入口，继续保持限制标签。需要“全行业持续覆盖”时，应按各赛道的关键系统、数据来源和实际使用需求定期查漏，而非无限扩充大众账号。
