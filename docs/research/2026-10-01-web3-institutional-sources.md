# Web3 机构、监管、研究与披露信源调研

调研日期：2026-10-01（北京时间）。本分支整理 **70 个机构级来源**：40 个数据、安全、调查、经济风险与投资研究来源，20 个监管/法源/国际标准及政策来源，10 个自身业务披露来源。个人 KOL 和协议官方来源由主报告另行汇总。

本清单为值得持续维护的候选库，不宣称穷尽全行业，也不以粉丝数直接证明权威。选入依据是可追溯到机构本人发布、具有可观察的专业产出或法定职能、对行业判断具有具体用途。P0/P1 是**采集调研优先级**，不是准确性评分、投资评级或自动发布授权。未修改行业配置及线上信源。

## 阅读和采集边界

- **一手披露**：机构能证明自己发布了什么、实施了什么；自身营销和利益立场仍需标注。
- **外部研究**：Chainalysis、Glassnode、VC 等有专业方法，却不是协议、司法机关或市场事实的全知权威。描述“该机构估计/研究认为”，保留方法、样本和修订。
- **法律阶段**：咨询、草案、职员意见、正式规则、法院裁判和生效执行不能混称“监管批准”。FATF/FSB/IOSCO 建议需本地实施；BIS/IMF 作者论文不等于统一机构立场或法律。
- **安全阶段**：预警、疑似攻击、确认损失、追回与最终复盘需区分。审计针对特定版本和范围，不保证未来安全。
- **偿付与资金流**：储备证明/鉴证不等于完整财报审计；AUM 增减不等于净申购，链上转账不等于真实消费。
- **采集可用性**：本表验证官方网页/搜索索引入口。未把 RSS、付费 API、X 正文或登录内容写成已验收；Root 另有独立 feed 实测文件。读取失败仅是本轮工具结果，不推断来源全网失效。
- **访问和版权**：“公开”指本轮看到的公开入口，并不证明每篇全文免费或允许转载。输出自写摘要和原文链接；会员内容不绕过，商业数据授权另核。

## 当前入口发生的变化

本轮直接访问观察到：Coin Metrics 的 /insights 跳转到 [Talos Insights](https://www.talos.com/insights)，其中仍有 State of the Network；CCData 研究跳转到 [CoinDesk Data Reports](https://data.coindesk.com/reports)；Nansen /research 跳转博客；Artemis 的旧 research 入口跳转到 about.artemis.ai/research；Kaiko 旧研究站跳转 app.kaiko.com。Messari 当前研究页面标题含 “Messari by Blockworks”。这些属于**本轮页面/重定向观察**，不能代替企业收购历史审计，也不能证明所有旧 RSS 已迁移。现有接入的 feed 应单独按条目日期、链接和正文验收。

搜索曾给出 app.rwa-xyz.com 这一非目标域结果；未将其用于本清单。RWA.xyz 使用 [官方方法文档](https://docs.rwa.xyz/home)验证身份与数据模型，dashboard 抽取仍待验收。

## 数据、方法与学术研究（16）

| 来源与官方入口 | 用途 / 权威边界 | 入口、访问与优先级 | 本轮验证 |
|---|---|---|---|
| [Coin Metrics / Talos](https://www.talos.com/insights)<br>全球 | 链上、市场数据与 State of the Network；覆盖跨生态数据解释。<br>边界：第三方研究，指标依赖自身口径；商业数据商。旧域跳转不等于所有 RSS 已迁移。 | 网页研究栏目 / newsletter<br>公开文章；高级数据另计<br>P0 | 官方网页已读取；coinmetrics.io/insights 实际跳转至本地址；研究目录含 State of the Network。 |
| [Glassnode Research](https://research.glassnode.com/)<br>全球 | BTC/ETH 链上持币、周期与市场结构研究。<br>边界：实体聚类和资金流为模型解释；地址数不等于用户数；商业数据产品。 | 研究博客<br>公开文章与可能的会员研究；数据分层<br>P0 | 官方研究网页已读取；不等同已测试 RSS。 |
| [Nansen](https://nansen.ai/blog)<br>全球 | 钱包标签、资金行为与多链研究。<br>边界：Smart Money 为自定义标签；标签不能独立证明真实身份或内幕行为；商业产品。 | 博客 / 研究<br>公开博客；详细标签和数据产品需另核授权<br>P1 | nansen.ai/research 跳转至博客；官方列表已读取。 |
| [CryptoQuant Quicktake](https://cryptoquant.com/insights/quicktake)<br>全球 | 交易所流入流出、链上趋势与市场观察。<br>边界：Quicktake 包含外部投稿，不全是机构研究；推测需注明作者与数据窗口。 | 研究 / 投稿流<br>部分公开；数据套餐另核<br>P1 | 官方 Quicktake 页面已读取；列表抽取较少，作者逐条核实。 |
| [Kaiko](https://www.kaiko.com/resources/categories/data-blog)<br>全球 | 流动性、订单簿、交易所、衍生品市场结构。<br>边界：采样交易所和聚合方法决定覆盖；商业数据与合作研究需保留披露。 | Data Blog / Research app<br>公开博客；Research app 有免费账户，数据许可另计<br>P0 | 官方 Data Blog 已读取；旧 research.kaiko.com 跳转 app.kaiko.com，后者文本抽取为空。 |
| [CoinDesk Data（原 CCData 入口）](https://data.coindesk.com/reports)<br>全球 | 交易所、稳定币、衍生品与基金报告。<br>边界：区分数据研究与 CoinDesk 新闻编辑内容；交易所评级由自定方法生成。 | 报告目录<br>公开报告和商业数据产品<br>P1 | ccdata.io/research 实际跳转本地址；官方报告页已读取。 |
| [Messari](https://messari.io/research)<br>全球 | 项目基本面、季度行业研究与治理分析。<br>边界：第三方分析不等同项目官方；区分付费、委托/赞助与独立研究。 | 研究目录<br>公开与会员内容混合，逐篇判断<br>P1 | 官方目录已读取；当前页面标题含 Messari by Blockworks，仅记录页面事实。 |
| [Artemis](https://about.artemis.ai/research)<br>全球 | 链活跃度、稳定币支付与跨链经济指标。<br>边界：活跃地址、交易数、支付量不同于真实用户和商品消费；商业数据口径。 | 研究目录<br>公开文章；API/终端授权另核<br>P0 | artemisanalytics.com/research 跳转本地址；官方研究页已读取。 |
| [Token Terminal](https://tokenterminal.com/)<br>全球 | 协议费用、收入及基本面标准化数据。<br>边界：费用、协议收入、代币持有人收入不能混用；不是财报审计；商业数据产品。 | 指标平台 / 研究<br>公开页面与付费功能混合<br>P0 | 官方平台页面及 Fees、Revenue 等目录已读取；未测试 API。 |
| [Dune](https://dune.com/home)<br>全球 | 可复核 SQL 与链上仪表板。<br>边界：平台不是每个用户仪表板的事实背书；必须选作者、查询版本、链和时间窗口。 | 数据仪表板 / SQL<br>公开仪表板；额度和高级服务另核<br>P1 | dune.com 跳转 /home；官方平台页已读取。 |
| [DefiLlama](https://defillama.com/)<br>全球 | TVL、DEX/永续成交、费用、稳定币与多链对比。<br>边界：TVL 受适配器、资产价格和重复计数定义影响；不是项目审计。 | 数据平台 / 方法 / API 文档<br>公开平台与 premium 混合<br>P0 | 官方平台已读取，见 Data Definitions 和 API 链接；未测试 API。 |
| [Electric Capital Developer Report](https://www.developerreport.com/)<br>全球 | 开源开发者迁移、生态开发者规模与年度报告。<br>边界：GitHub 活动不能等同真实用户/商业收入；风投持仓与分类方法影响结果。 | 年度报告 / 数据平台<br>公开报告及方法；具体下载另核<br>P0 | 官方 Developer Report 页面已读取，标题明确由 Electric Capital 发布。 |
| [L2BEAT](https://l2beat.com/)<br>全球 | L2 技术、安全假设、去中心化阶段与风险资料。<br>边界：Stage/风险维度是公开框架评价；不是收益评级或运行无风险保证。 | 风险数据库 / 研究<br>公开<br>P0 | 官方平台已读取；纳入用于风险核验而非仅按 TVL 排名。 |
| [RWA.xyz](https://docs.rwa.xyz/home)<br>全球 | 代币化资产分类、数据模型、方法与 API 说明。<br>边界：发行人提供的链外资产需外部证据；上链数量不保证底层资产法律权益或偿付。 | 方法文档 / 数据平台候选<br>公开文档；数据 API 授权另核<br>P0 | 官方 docs.rwa.xyz 已读取；rwa.xyz 超工具文本上限，app.rwa.xyz 读取失败；未验证仪表板采集。 |
| [Tokenomist](https://tokenomist.ai/)<br>全球 | 解锁、归属期与流通供应计划。<br>边界：计划解锁不等于实际卖压；以项目最新合约/官方计划交叉核查。 | 解锁数据平台<br>公开页面；高级数据另核<br>P1 | 官方平台页面已读取；未测试数据接口。 |
| [Cambridge Centre for Alternative Finance](https://www.jbs.cam.ac.uk/faculty-research/centres/alternative-finance/)<br>全球 / 英国 | 学术机构数字资产研究、矿业、监管比较与实证调查。<br>边界：低频严谨研究；调查有样本限制，需记录资助者和方法；不能冒充即时监管文件。 | 研究中心 / 报告<br>公开报告；课程另计<br>P1 | 剑桥官方中心网页已检索并读取，含 Digital Assets Programme 和方法说明。 |

## 金融犯罪与链上调查（3）

| 来源与官方入口 | 用途 / 权威边界 | 入口、访问与优先级 | 本轮验证 |
|---|---|---|---|
| [Chainalysis](https://www.chainalysis.com/blog/)<br>全球 | 犯罪、采用、监管与链上资金追踪报告。<br>边界：已知非法地址集合会更新；非法占比依定义/分母而变，链外犯罪不可能仅由链上完全确定；商业 AML 服务。 | 博客 / 报告<br>公开博客；完整报告可能需表单，产品商业<br>P0 | 官方博客与 Crypto Crime 方法说明已读取。 |
| [TRM Labs](https://www.trmlabs.com/resources)<br>全球 | 金融犯罪、制裁、稳定币与全球政策研究。<br>边界：地址归因与犯罪估计依赖模型/客户/样本；不能与其他机构口径直接相加。 | 报告 / 博客 / 白皮书<br>公开目录；部分材料需注册或表单，商业产品<br>P0 | 官方 Resources 页面已读取。 |
| [Elliptic](https://www.elliptic.co/insights/)<br>全球 | 制裁、犯罪、跨链洗钱与合规情报。<br>边界：第三方情报，不是法院判决；商业合规产品，地址归因需证据等级。 | Insights / 报告<br>公开文章；完整报告和产品另核<br>P1 | elliptic.co/blog 跳转 /insights/；官方列表已读取。 |

## 安全与漏洞研究（9）

| 来源与官方入口 | 用途 / 权威边界 | 入口、访问与优先级 | 本轮验证 |
|---|---|---|---|
| [CertiK](https://www.certik.com/blog)<br>全球 | 漏洞、攻击复盘与损失统计。<br>边界：审计范围、版本和客户利益必须保留；安全评分不是资产无风险证明。 | 安全博客<br>公开博客；商业审计/监控<br>P1 | 旧 /resources/blog 跳转 /blog；官方文章列表已读取。 |
| [SlowMist / 慢雾](https://slowmist.medium.com/)<br>全球 / 中文 | 中文生态安全事件、攻击复盘、链上追踪与防骗。<br>边界：审计服务商；初期归因和损失金额可修订，需项目公告/链上记录互证。 | Medium 博客 / 官网<br>公开报告/博客；商业安全服务<br>P0 | Medium 官方署名页及 slowmist.com 官网已读取；官网对应身份已核。 |
| [PeckShield](https://peckshield.com/)<br>全球 / 中文 | 安全预警、攻击事件与链上取证候选。<br>边界：快讯初判需原始交易和后续复盘确认；审计服务商；不要仅凭 X 同名账号。 | 官网身份入口 / X 候选<br>官网公开；X 正文本轮未采集<br>P1 | 官网标题已确认，但仅 1 行可抽取；社交账号与最新帖子未逐条验证，保留候选。 |
| [BlockSec](https://blocksec.com/blog)<br>全球 / 中文 | 攻击路径、交易分析、DeFi 防护与安全复盘。<br>边界：商业防护/审计服务；自报阻止攻击与损失统计需保留方法。 | 安全博客<br>公开博客；商业工具<br>P0 | 官方 Blog 页面已读取。 |
| [Trail of Bits](https://blog.trailofbits.com/)<br>全球 | 密码学、ZK、虚拟机、智能合约审计与可复现工具。<br>边界：商业安全顾问；审计仅对指定版本/范围负责；综合软件安全博客需 Web3 过滤。 | 技术博客<br>公开博客/工具；商业审计<br>P0 | 官方博客已读取，有区块链漏洞与 Uniswap hooks 等文章。 |
| [OpenZeppelin](https://www.openzeppelin.com/news)<br>全球 | 合约库发布、安全审计、漏洞与开发安全实践。<br>边界：对自有代码库发布是一手；对受审项目仅是限定版本审计意见，不能替代持续风控。 | News / 审计报告<br>公开文章与报告；商业服务<br>P0 | 官方 News 页面已读取。 |
| [OtterSec](https://osec.io/blog/)<br>全球 | Solana、Move 等生态漏洞与技术审计。<br>边界：商业审计机构；区分公开复盘、客户报告与产品介绍。 | 技术博客<br>公开博客；商业审计<br>P1 | 官方 Blog 列表已读取。 |
| [Immunefi](https://immunefi.com/blog/)<br>全球 | 漏洞赏金、攻击损失报告与研究者披露。<br>边界：赏金平台数据具有覆盖边界；收录项目不代表无漏洞，报告统计需注明样本。 | 安全博客 / 赏金项目<br>公开博客/项目；参与赏金受规则约束<br>P0 | 官方 Blog 页面已读取。 |
| [Halborn](https://www.halborn.com/blog)<br>全球 | 漏洞解释、攻击复盘与钱包/链安全。<br>边界：商业审计公司；需筛掉营销和通用科普，审计不是未来安全保证。 | 安全博客<br>公开博客；商业审计<br>P1 | 官方 Blog 列表已读取。 |

## DeFi 经济风险研究（2）

| 来源与官方入口 | 用途 / 权威边界 | 入口、访问与优先级 | 本轮验证 |
|---|---|---|---|
| [Gauntlet](https://www.gauntlet.xyz/resources)<br>全球 | DeFi 经济安全、风险模型、参数与治理建议。<br>边界：风险服务商可能直接管理策略/金库；建议不等于 DAO 已通过，模型参数和客户关系须保留。 | 研究 / 资源 / 治理建议<br>公开资料；完整模型和商业服务另核<br>P0 | 官方 Resources 列表已读取。 |
| [Chaos Labs](https://chaoslabs.xyz/)<br>全球 | 经济安全、模拟、协议风险与参数研究。<br>边界：模型有未公开部分；风险服务/预言机/策略产品利益关系须标明；提交建议不等于实施。 | 官网 / 方法 PDF / 治理候选<br>公开方法和官网；商业产品<br>P1 | 官网官方搜索证据与官方 GMX risk methodology PDF 已核；/resources 本轮读取失败。 |

## 投资与机构研究（10）

| 来源与官方入口 | 用途 / 权威边界 | 入口、访问与优先级 | 本轮验证 |
|---|---|---|---|
| [a16z crypto](https://a16zcrypto.com/posts/)<br>全球 / 美国 | 技术研究、行业年度报告、开发工具与政策分析。<br>边界：风投持仓和政策立场会影响选题；独立技术证明与投资叙事分别标注。 | 研究 / 技术 / 政策栏目<br>公开文章；基金商业利益<br>P0 | 官方 All Content 列表已读取。 |
| [Paradigm](https://www.paradigm.xyz/writing)<br>全球 / 美国 | 机制设计、AMM、MEV、技术与政策原始研究。<br>边界：投资者对持仓项目有利益；技术推导需假设/实验支持，观点不是市场事实。 | 技术研究 / Writing<br>公开<br>P0 | 官方 Writing 列表已读取。 |
| [Galaxy Research](https://www.galaxy.com/insights/research)<br>全球 | 宏观市场、协议、矿业与机构配置研究。<br>边界：交易、资管和投行业务利益；研究估值不等于确定收益或独立审计。 | 研究报告<br>公开研究；部分内容登记和业务权限另核<br>P0 | 官方 Research 页面已读取。 |
| [Delphi Digital](https://members.delphidigital.io/)<br>全球 | 机制、生态和专题深度研究。<br>边界：研究、投资和孵化业务潜在交叉；必须保留透明度披露；会员内容不可绕过。 | 会员研究 / 公开媒体<br>免费目录与会员内容混合；全文访问未验<br>P1 | 官方目录已读取，见 Login、Subscription、Transparency；未进入付费内容。 |
| [Binance Research](https://www.binance.com/en/research)<br>全球 | 月报、细分行业与项目经济模型报告。<br>边界：交易所和上币生态利益；自称 unbiased 不能作为独立性证明；项目简介不等于外部核验。 | 行业 / 项目研究<br>公开文章与 PDF<br>P1 | research.binance.com 跳转此地址；官方列表及免责声明已读取。 |
| [Coinbase Institutional Research](https://www.coinbase.com/institutional/research-insights)<br>全球 / 美国 | 机构市场观点、周报与年度研究。<br>边界：交易所/托管/产品利益；研究观点不等于平台审计或监管认定。 | 机构研究入口<br>公开与机构账户条件另核<br>P1 | 官方页面标题已确认，但正文抽取 0 行；采集适配待验证。 |
| [Bitwise](https://bitwiseinvestments.com/crypto-market-insights)<br>全球 / 美国 | 市场季报、机构采用、质押与投资组合研究。<br>边界：ETF/资管发行人利益明显；调查样本和预测要标注；自身产品数据与观点分开。 | 市场研究 / Insights<br>公开文章；专家门户需账户<br>P1 | 官方 Insights 已读取，含 Research 与 Expert Portal 区别。 |
| [Grayscale Research](https://institute.grayscale.com/)<br>全球 / 美国 | 资管视角行业分类、代币研究与数字资产教育。<br>边界：发行人可能持有讨论资产；教育/观点不等于推荐；页面声明转载需许可，只链接自写摘要。 | 研究 / Institute / The Stack 候选<br>公开教育入口；事件注册和全文权限另核<br>P1 | 官方 Institute 已读取并链接 The Stack；grayscale.com/research 本轮读取失败。 |
| [CoinShares](https://coinshares.com/insights/)<br>全球 / 欧洲 | 数字资产基金资金流、市场和投资研究。<br>边界：基金流不是全行业资金流；发行人利益与统计产品范围须说明。 | 研究 / Fund Flows<br>公开文章与报告；商业资管<br>P0 | 官方 Insights 列表已读取。 |
| [Fidelity Digital Assets](https://www.fidelitydigitalassets.com/research-and-insights)<br>全球 / 美国 | 机构持有、投资框架和数字资产技术研究。<br>边界：托管/服务商利益；调查样本不能代表全球所有投资者。 | 研究 / Insights<br>公开研究；部分资源下载条件另核<br>P1 | 官方 Research 页面已读取。 |

## 司法辖区监管和法源（15）

| 来源与官方入口 | 用途 / 权威边界 | 入口、访问与优先级 | 本轮验证 |
|---|---|---|---|
| [美国 SEC](https://www.sec.gov/newsroom/press-releases)<br>美国 | 证券、ETF、执法和规则的一手发布。<br>边界：新闻稿不是完整裁判/规则正文；诉讼指控不等于定罪，提案不等于生效。 | 新闻稿 / 规则 / EDGAR<br>公开<br>P0 | 官方 Press Releases 已读取，含 RSS 导航；本文未测试 feed。 |
| [美国 CFTC](https://www.cftc.gov/PressRoom/PressReleases)<br>美国 | 衍生品、商品、预测市场与执法一手发布。<br>边界：适用范围要按商品/衍生品/主体区分；职员意见和 no-action letter 不等同国会法律。 | 新闻稿 / 规则 / Staff letters<br>公开<br>P0 | 官方 Press Releases 列表已读取。 |
| [美国财政部 OFAC](https://ofac.treasury.gov/recent-actions)<br>美国 / 跨境影响 | 制裁更新、名单与执法公告。<br>边界：美国制裁管辖；地址名单与整个协议/所有用户不应泛化；需对照生效日和 FAQ。 | Recent Actions / 制裁名单<br>公开<br>P0 | 官方 Recent Actions 已读取。 |
| [美国 FinCEN](https://www.fincen.gov/news)<br>美国 | 反洗钱规则、金融犯罪通告和处罚。<br>边界：区分拟议规则、最终规则、指引与警报；针对主体业务的要求不能随意推广。 | News / Advisories / 规则<br>公开<br>P1 | 旧 /news-room 跳转 /news；官方页面已读取。 |
| [ESMA](https://www.esma.europa.eu/esmas-activities/digital-finance-and-innovation/markets-crypto-assets-regulation-mica)<br>欧盟 | MiCA、CASP、白皮书、监管技术标准与名录。<br>边界：白皮书列入名录不代表监管批准内容；区分 consultation、draft RTS、adopted 与适用日期。 | MiCA 专题 / 技术标准 / Register<br>公开<br>P0 | 官方 MiCA 页面已读取，白皮书未获主管机构审核/批准的提示明确。 |
| [EBA](https://www.eba.europa.eu/regulation-and-policy/asset-referenced-and-e-money-tokens-mica)<br>欧盟 | MiCA 下 ART/EMT、储备、治理与监管技术标准。<br>边界：EBA 最终草案、委员会采纳及 Official Journal 发布为不同法律阶段。 | MiCA 专题 / 技术标准<br>公开<br>P0 | 官方专题搜索索引正文已核；工具 open 返回失败，网页采集待验证。 |
| [EUR-Lex](https://eur-lex.europa.eu/eli/reg/2023/1114/oj)<br>欧盟 | 欧盟正式法律文本与公报；MiCA 作为代表入口。<br>边界：原始版本与修订合并版本不同；生效日与适用日分开；这是法源不是新闻栏目。 | 法律 / Official Journal<br>公开；反机器人读取条件<br>P0 | 官方 URL 已访问，但返回 JavaScript/反机器人提示，正文未验证；ESMA 官方 Single Rulebook 交叉索引已核。 |
| [香港证监会 SFC](https://www.sfc.hk/en/News-and-announcements)<br>香港 | 虚拟资产交易平台、基金、托管与投资者保护公告。<br>边界：香港监管范围；持牌实体与品牌/产品不能混同；审批特定产品不等于资产安全保证。 | 新闻 / 通函 / 咨询 / 名录<br>公开；中文/英文<br>P0 | 官方 News and announcements 已读取。 |
| [香港金管局 HKMA](https://apidocs.hkma.gov.hk/documentation/press-releases/)<br>香港 | 稳定币、银行数字资产、支付与代币化试验一手资料。<br>边界：牌照仅限指定主体与业务；政策咨询、试验和正式制度分别标注。 | 新闻稿 API 文档 / 官网公告<br>公开<br>P0 | 官方新闻稿 API 文档已读取；网页新闻栏目读取失败；未执行 API 请求。 |
| [新加坡 MAS](https://www.mas.gov.sg/news)<br>新加坡 | DPT、稳定币、机构代币化与执法/牌照公告。<br>边界：研究试点不等于全面许可；需查主体许可证及业务范围。 | News / consultation / directory<br>公开<br>P0 | 官方 News 页面已读取，动态列表适配仍需实测。 |
| [中国人民银行](https://www.pbc.gov.cn/goutongjiaoliu/113456/113469/index.html)<br>中国内地 | 内地虚拟货币监管、支付、反洗钱与数字人民币官方信息。<br>边界：内地与香港政策不能互套；数字人民币、区块链应用和代币交易区分；多部门文件需保留联署。 | 新闻 / 通知 / 政策<br>公开；中文<br>P0 | 官方新闻目录已读取。 |
| [英国 FCA](https://www.fca.org.uk/news)<br>英国 | 加密业务注册、营销、稳定币/市场规则与执法。<br>边界：AML 注册不等于产品背书或完整审慎许可；拟议政策与最终规则分别标注。 | News / consultation / register<br>公开<br>P0 | 官方 News 页面已读取。 |
| [日本金融厅 FSA](https://www.fsa.go.jp/en/news/)<br>日本 | 加密交换、稳定币、监管改革与执法公告。<br>边界：英文与日文发布时间/细节可能不同；JVCEA 自律规则不是 FSA 法律。 | 新闻 / 政策 / 名录<br>公开；日文/英文<br>P1 | 官方 English Press Releases 2026 页面已读取。 |
| [Dubai VARA](https://www.vara.ae/en/)<br>阿联酋 / 迪拜 | 迪拜虚拟资产规则、牌照、执法与市场通函。<br>边界：迪拜范围不能泛化到整个 UAE；DIFC 等辖区须查各自主管机构。 | 规则 / 公告 / 名录 / 执法<br>公开<br>P1 | 官方官网与 Enforcement 页面已读取。 |
| [瑞士 FINMA](https://www.finma.ch/en/news/)<br>瑞士 | 稳定币、托管、数字资产银行与执法官方资料。<br>边界：监管技术中立指引不等于批准任意项目；牌照、sandbox 和产品风险分开。 | News / guidance / register<br>公开<br>P1 | 官方 News 页面已读取。 |

## 国际标准和宏观政策研究（5）

| 来源与官方入口 | 用途 / 权威边界 | 入口、访问与优先级 | 本轮验证 |
|---|---|---|---|
| [FATF](https://www.fatf-gafi.org/en/topics/virtual-assets.html)<br>国际 | VASP、Travel Rule、DeFi 功能性监管与全球 AML 标准。<br>边界：国际标准需由司法辖区实施；不是可直接套用的全球法律。 | 专题 / 报告 / Recommendations<br>公开<br>P0 | 官方 Virtual Assets 页面已读取。 |
| [Financial Stability Board](https://www.fsb.org/work-of-the-fsb/financial-innovation-and-structural-change/crypto-assets-and-global-stablecoins/)<br>国际 | 全球加密资产、稳定币政策框架与实施评估。<br>边界：协调性建议和评估，不等于成员国已完成立法。 | 专题 / 报告 / 建议<br>公开<br>P0 | 官方 crypto-assets and stablecoins 页面已读取。 |
| [BIS / BCBS / CPMI](https://www.bis.org/publications)<br>国际 | 央行、代币化、支付基础设施和银行审慎研究/标准。<br>边界：BIS 作者工作论文不等同 BIS 全体立场；BCBS 标准需本地实施；区分论文、标准和试验。 | 出版物 / 委员会标准<br>公开<br>P0 | 官方 Publications 已读取；tokenisation 文献官方搜索证据支持分类。 |
| [IOSCO](https://www.iosco.org/library/pubdocs/pdf/IOSCOPD754.pdf)<br>国际 | 证券监管全球协调、加密资产与 DeFi 政策建议。<br>边界：建议面向监管机构；不是直接执法法源，国内落实状态另核。 | 正式政策报告 / 官网目录候选<br>公开 PDF<br>P1 | 官方正式报告 URL 搜索索引已核；官网/目录工具访问失败，未实测 PDF 解析。 |
| [IMF](https://www.elibrary.imf.org/view/journals/068/2026/001/068.2026.issue-001-en.xml)<br>国际 | 宏观金融、跨境流动、代币化与政策研究。<br>边界：Working Papers/Fintech Notes 常为作者观点；不等同 IMF 执行董事会立场或本地法律。 | 论文 / 政策报告 / eLibrary<br>公开摘要与部分全文；逐篇检查<br>P1 | 官方 eLibrary Tokenized Finance 2026 出版物及官方论文免责声明已核；主题入口正文为空。 |

## 市场、发行人和法定披露（10）

| 来源与官方入口 | 用途 / 权威边界 | 入口、访问与优先级 | 本轮验证 |
|---|---|---|---|
| [CME Group Crypto](https://www.cmegroup.com/markets/cryptocurrencies)<br>美国 / 全球机构市场 | 加密期货/期权合约规格、产品公告、结算与成交数据。<br>边界：自身交易场所数据是一手；不能代表全球全部未平仓/成交或现金 ETF 流。 | 产品 / 合约 / 市场数据<br>公开规格；实时/历史数据许可另核<br>P1 | 官方 Cryptocurrencies 页面已读取，.html 跳转无后缀地址。 |
| [Circle Transparency](https://www.circle.com/transparency)<br>全球 / 美国及欧洲业务 | USDC/EURC 发行量、储备披露与鉴证文件入口。<br>边界：发行人披露与第三方鉴证分开；鉴证只覆盖特定时点/范围，不等于所有业务的完整财报审计或未来偿付保证。 | 发行人透明度 / 鉴证<br>公开<br>P0 | 官方 Transparency 页面已读取；本文未核验每期报告的会计师签名和鉴证范围。 |
| [Tether Transparency](https://tether.to/en/transparency/)<br>全球 | USDT 等资产储备与发行人披露。<br>边界：自报发行量、储备报告和鉴证不同于完整财报审计；特定时点数据不能证明持续流动性或全部负债覆盖。 | 发行人透明度 / 储备报告<br>公开<br>P0 | 官方 Transparency 页面已读取；具体最新鉴证文件范围另核。 |
| [BlackRock / iShares IBIT](https://www.ishares.com/us/products/333011/ishares-bitcoin-trust-etf)<br>美国 | 产品持仓、净值、费用、法律文件与官方 ETF 资料。<br>边界：自身基金资料是一手，产品营销存在发行人利益；AUM 变化包含价格变动，不等于净流入。 | ETF 官方产品 / 法律文件<br>公开<br>P1 | 官方 IBIT 产品页已读取；未核验所有日更下载内容。 |
| [Coinbase SEC Filings](https://investor.coinbase.com/financials/sec-filings/default.aspx)<br>美国 | 上市公司法定披露、收入、风险和托管业务财务资料。<br>边界：公司提交文件不等于 SEC 为内容背书；审计报表、非 GAAP 与管理层预期需区分。 | Investor Relations / SEC filings<br>公开<br>P1 | 官方 SEC Filings 列表已读取；EDGAR 原件可用于后续交叉验证。 |
| [Strategy](https://www.strategy.com/press)<br>美国 / 全球机构市场 | 上市公司 BTC 财库、融资、优先股与财报官方披露。<br>边界：管理层 BTC Yield 等自定义指标不是股东现金收益；持仓/融资新闻需与 SEC 原件核对。 | 公司 / 市场基础设施公告与法定披露<br>公开入口；具体下载许可另核<br>P1 | 官方 Press archive 已读取，含 Investor Relations 和季度财报。 |
| [MARA](https://ir.mara.com/news-events/press-releases)<br>美国 / 全球机构市场 | 矿企运营、能源、持币、融资及财报一手披露。<br>边界：仅代表本公司；产量、算力与自定义成本口径需核对，不能代表全网矿业。 | 公司 / 市场基础设施公告与法定披露<br>公开入口；具体下载许可另核<br>P1 | 官方 IR Press Releases 已读取；页面存在 News RSS 导航，但未测试 feed。 |
| [Riot Platforms](https://www.riotplatforms.com/investors/)<br>美国 / 全球机构市场 | 矿业、数据中心、财务与公司运营一手披露。<br>边界：区分自有/托管算力、销售持币、非 GAAP 与 audited statements；自身 PR 有利益。 | 公司 / 市场基础设施公告与法定披露<br>公开入口；具体下载许可另核<br>P1 | 官方 IR 首页已读取并列出 Press Releases、SEC Filings 和 Financial Results。 |
| [DTCC](https://www.dtcc.com/insights)<br>美国 / 全球机构市场 | 市场基础设施、证券结算与机构代币化一手资料。<br>边界：概念研究、试验、许可和正式生产服务需逐项区分；业务方公告不是全行业监管规则。 | 公司 / 市场基础设施公告与法定披露<br>公开入口；具体下载许可另核<br>P1 | 官方 /news 跳转 /insights，页面已读取；综合财经栏目需 Web3 过滤。 |
| [Securitize](https://investors.securitize.io/overview/)<br>美国 / 全球机构市场 | 代币化资产发行/转让基础设施、合作与财务一手披露。<br>边界：发行平台营销不能证明链外权益或资产独立审计；合作意向、上线、规模分别核验。 | 公司 / 市场基础设施公告与法定披露<br>公开入口；具体下载许可另核<br>P1 | 官方 investor 域名目录与季度财报搜索索引已核；securitize.io/news 读取失败。 |

## 对 9BTC 的实际接入建议

第一批以“能补充不同证据类型”为标准：数据类 Coin Metrics、Kaiko、Artemis、DefiLlama、L2BEAT；安全类 SlowMist、BlockSec、Trail of Bits、Immunefi；监管类 SEC/CFTC/OFAC、香港 SFC/HKMA、新加坡 MAS、ESMA/EBA 和中国人民银行；深度研究 a16z、Paradigm、Galaxy、CoinShares；稳定币透明度 Circle/Tether。每类挑少量稳定产出的入口，先补足覆盖再增加数量。

低频正式报告保留高关注优先级但降低抓取频率。Dune、CryptoQuant 投稿、VC、发行人营销和初期攻击快讯应进入额外证据核验队列；可由系统独立核验，不能因机构名气直接放行；一条内容是否能自动发布，必须由样本表现、证据链与站点编辑规则决定，不由机构名气决定。

每个后续接入候选应补齐：真实 feed/API/list URL、分页与更新机制、样本条目数和日期、权限/许可、重复率、项目/作者识别、版权策略、错误恢复与停止条件。当前 JSON 的 productionEnabled 全为 false，仅表明调研清单不是启用配置；不代表已在站点运行的既有来源状态。

## 未覆盖完的增补方向

加拿大 CSA/OSC、澳大利亚 ASIC、巴西 BCB/CVM、韩国 FSC/FSS、印度 RBI/FIU、台湾 FSC、阿联酋 ADGM/DFSA、美国州级监管（如 NYDFS）、美国司法部/法院原件、证券交易所与更多 ETF/托管机构、NIST/ISO/IETF、密码学学术会议和大学研究组。全球范围需按 9BTC 目标读者与主题逐步增补，不能把本轮 20 个监管/标准机构称为全部辖区。

## 获取方式说明

使用 agent-reach skill 的 search/web 路由。Exa 在本分支首次受网络沙箱影响失败；以 web 工具的官方网页与官方域搜索完成证据核验。未读取 X 最新正文、会员账户或绕过付费内容。所有表格来源直接链接官方入口，不使用通用媒体作为权威证明。

