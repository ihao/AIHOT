# Web3个人信源：专业能力、利益边界与接入候选

调研日期：2026-10-01（北京时间）。这是9BTC的候选目录，不是粉丝排行榜，也不是已上线信源清单。本次筛选44名专业候选与12名条件观察者；“候选”只意味着有具体专业产出或身份锚点，不能解释为其所有言论权威。

## 怎么判断个人信源的权威

影响力和可信度是两条轴。能影响讨论的人适合发现议题；有代码、规范、署名论文、可复核调查和完整采访的人，才适合为具体事实提供证据。技术作者对其研究领域更有权威，协议创始人对自己的项目计划有一手价值；两者都不自动获得预测价格、评价竞品或解释法律的权威。本目录的P0/P1/P2是编辑接入顺序，不是人物身价或声望排名。

- P0：先试接的专业原始材料。只处理范围内的技术/调查/采访文章，逐篇核查。
- P1：补充不同路线、研究框架与中文机制讨论。保留作者身份和利益说明。
- P2：低频、历史文献或身份可验而持续入口待补。不能假装是实时新闻流。
- P3：条件观察，发现议题后寻找项目文档、交易、会议、监管原件等更直接证据；身份欠缺者不接入。

`editorial`表示可进入选题研究与系统核验；`hot_signal_only`只作讨论线索；`identity_verification_required`表示先补身份再讨论接入。所有模式均为建议，未修改9BTC生产配置。KOL不存在统一的“官方性”：作者本人的页面只能证明作者/主张出处，不证明主张成立。

## 本次验证边界

按agent-reach路由使用Exa公开搜索、Jina读取与web官方页面复核；普通沙箱Exa失败后，只读网络权限下搜索成功。X专用CLI和OpenCLI后端未安装，未登录X采集。**没有实测最新时间线、粉丝数量、近期互动率、全部账号历史或预测正确率；不报告粉丝数，不宣称这是2026实时KOL榜单。**只有本站、机构本人页或其署名原件明确关联的handle才写入JSON；缺失字段表示尚未核验，并非没有账号。

网页可读、身份锚点成立、RSS存在、RSS可解析、近期有内容、可合法商用，是六个独立检查。此分支完成前两类为主，不把HTML页面误写成已验RSS。个人站自述能证明其声明；雇主/项目官网可加强任职锚点，但网页可能过时。低频目录已明确降级；静态身份页/单篇论文不是自动内容列表。

## 优先核查的纠偏

1. [Dankrad本人About](https://dankradfeist.de/about/)当前写Tempo Labs工作、EF Protocol Cluster研究顾问；不能继续写“EF全职研究员”。
2. [Fred Ehrsam官方档案](https://www.paradigm.xyz/team/fred-ehrsam)是Co-Founder & Senior Advisor；当前工作含Nudge，旧GP标题应更新。
3. [Christine本人About](https://christinedkim.substack.com/about)用“At Galaxy Digital, I led”过去式；[Galaxy旧作者目录](https://www.galaxy.com/authors/christine-kim)保留VP介绍，当前职位不据旧页下结论。
4. [Sonic官方2026年领导变更](https://www.soniclabs.com/blog/leadership-update-from-sonic-labs/)说明Andre Cronje退出董事及常规参与；[本人当前官网](https://andrecronje.info/)列Flying Tulip与Witnessnet。
5. [Evan本人停刊公告](https://weekinethereum.substack.com/p/week-in-ethereum-has-ended-heres)说明Week in Ethereum于2025年结束；现在Substack的个人收益观点不能冒充旧开发周报。
6. 吴说正确互链为[中文官网](https://wublock123.com/)、[英文官网](https://www.wublockchain.xyz/)、[官方Linktree](https://linktr.ee/wublockchain)与[wublock Substack](https://wublock.substack.com/about)。`wublockchain.com`本次Jina实测为域名售卖页，排除。中文官网含未许可转载/复制/商用禁止声明；正式商用应先确认授权。
7. `thedailygwei.com`本次可读内容为Namecheap停放页，不能沿用旧域；使用[实际刊物](https://thedailygwei.substack.com/about)复核。
8. `zachxbt.live`在检索中自称官方，但本次没有本人跨链身份锚点，排除；使用[公开调查频道](https://t.me/investigations)及其自链调查。

## 专业候选目录

下表入口包含博客、作者页、规范署名、个人身份页与刊物。`入口`指核验起点；接入时须再定位稳定内容列表、合法摘要范围和采集方式。共同的粉丝/X验证限制不在每行重复。

### ETH协议与密码学

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Vitalik Buterin](https://vitalik.eth.limo/) | 官网持续发表协议扩容、密码学、隐私与治理原始论述；本次首页可见2026年文章。 | 对自己提出的技术论证有一手价值；个人设想不等于EIP已通过或网络已部署，价格判断无额外权威。 | P0 · editorial · blog |

### BTC与自托管

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Jameson Lopp](https://blog.lopp.net/) | 自有博客包含节点性能测试、BIP争论、量子迁移两方分析；官网标明Casa联合创始人及CSO。 | 在节点测试、安全与托管方法上优先；涉及Casa产品或投资标的须披露利益；个人政治观点另行过滤。 | P0 · editorial · blog |

### BTC协议研究

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Peter Todd](https://petertodd.org/) | 可读BIP-110代码审查、RBF、CoinJoin、Lightning和OpenTimestamps原始文章。 | 采纳可复核技术论据；BTC/ETH争论和个人立场不能替代代码或规范，协议提案不等于共识。 | P0 · editorial · blog |

### BTC与Lightning

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Matt Corallo / BlueMatt](https://bluematt.bitcoin.ninja/) / @TheBlueMatt | 本人博客说明Bitcoin设计与价值取舍；Spiral官方文章明确将Matt Corallo与TheBlueMatt对应。 | 开发者观点适用于协议与自托管；博客明确意见属于个人；不代表Bitcoin全体开发者。 | P1 · editorial · blog |

### BTC密码学与产业

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Adam Back](https://blog.blockstream.com/author/adam-back/) | Blockstream官方领导页确认联合创始人及CEO、Hashcash发明者；有官方署名技术文章。 | Hashcash及Blockstream自身技术有一手地位；Liquid、挖矿和公司金融产品存在商业利益；作者页旧文多，更新入口需再测。 | P2 · editorial · author-directory |

### BTC研究与宏观

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Nic Carter](https://niccarter.info/) | 个人站整理论文与署名文章，2026年持续提出Bitcoin量子风险和迁移方案的反方论述。 | 投资者/评论者框架需要复核；不代表Coin Metrics官方数据；争议论断须并列代码研究和不同判断。 | P1 · editorial · blog |

### 货币机制与宏观

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Lyn Alden](https://www.lynalden.com/) | 自有研究公司官网、长期货币技术论述；自述明确研究与Ego Death Capital投资身份。 | 宏观机制和历史分析有参考价值；宏观预测不是监管事实或资产回报保证；BTC投资与基金利益须披露。 | P1 · editorial · blog |

### BTC技术教育

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Andreas M. Antonopoulos](https://aantonop.com/) | 本人网站列技术书籍、公开视频和开放区块链教育材料。 | 优先教育和安全概念；不是当前网络参数或最新版本的唯一依据；书籍/课程商业推广过滤。 | P2 · editorial · blog |

### ETH数据可用性与共识

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Dankrad Feist](https://dankradfeist.de/) / @dankrad | 本人About列EIP-4844、DA采样与协议贡献；当前明确在Tempo Labs工作并为EF Protocol Cluster研究顾问。 | 个人意见与Tempo公告须分开；不得继续简写成EF全职现任研究员；顾问/任职/持仓对观点的影响查Disclosures。 | P0 · editorial · blog |

### ETH升级与开发会议

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Tim Beiko](https://notes.ethereum.org/@timbeiko) | Ethereum域下个人HackMD页面是开发协调笔记与会议材料的署名入口。 | 会议安排、议程、讨论有一手性；讨论中的纳入项不等于硬分叉已执行；需与EIPs及客户端发布交叉核对。 | P0 · editorial · notes |

### ETH共识与抗量子研究

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Justin Drake](https://blog.ethereum.org/2025/07/31/lean-ethereum) | EF官网本人署名lean Ethereum愿景，明确提出研究路线并提示观点多样性。 | 愿景和研究是假设与目标；文章自己标注Drake take，不能写成EF正式决议；具体时程须验规范。 | P0 · editorial · authored-article |

### 机制设计与ETH经济学

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Barnabé Monnot](https://barnabemonnot.com/) | 个人站及出版列表可核查算法博弈论、密码经济学和历史EF研究身份。 | 本人旧站新闻停留2020年；当前职务不能从旧简介推断。本次未用第三方X镜像的现职介绍作已验证事实。 | P2 · editorial · blog |

### ETH共识与技术教育

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Ben Edgington](https://benjaminion.xyz/) / @benjaminion_xyz | 作者本人站和Upgrading Ethereum技术手册可核对；EF Protocol Consensus团队页当前列External Consultant。 | 书的具体版本可能只到某次升级；须对照现行规范；历史Teku或OP Labs职务不得写成当前职务。 | P1 · editorial · personal-site |

### ETH开发跟踪与研究

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Christine D. Kim](https://christinedkim.substack.com/about) / @christine_dkim | 本人Substack说明专注BTC/ETH协议发展；Galaxy作者档案保留大量本人ACD会议写作。 | 会议摘要是署名研究而非会议表决；本人About用At Galaxy I led过去式，Galaxy旧作者页VP职位不能视为当前职务。 | P0 · editorial · newsletter |

### DeFi机制与市场结构

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Dan Robinson](https://www.paradigm.xyz/team/dan-robinson) / @danrobinson | 官方团队页列GP及研究职责，包含AMM、借贷、链上竞拍与Bitcoin量子保护的署名研究。 | 技术推导和模型可复核；VC被投项目、联合开发及政策主张有利益关系；作者与项目官方公告分开。 | P0 · editorial · author-directory |

### 开发基础设施与EVM

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Georgios Konstantopoulos](https://www.paradigm.xyz/team/georgios-konstantopoulos) | 官方团队页列Paradigm GP/CTO及Tempo CTO，署名Reth、Alloy、Foundry与扩容研究。 | 工具发布要回到GitHub版本；VC/Tempo双重利益明确标注；架构路线是作者选择，不代表通行标准。 | P0 · editorial · author-directory |

### DeFi量化风险与研究

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Tarun Chitra](https://www.gauntlet.xyz/team) | Gauntlet团队页当前列CEO；本人arXiv论文涉及链上借贷、质押竞争和intent市场。 | 模型有效性依赖假设与市场数据；公司有风险顾问/金库业务利益；个人站老旧，不用它做实时信源。 | P1 · editorial · official-bio |

### MEV与ETH经济学

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Hasu](https://research.flashbots.net/) | Flashbots官方研究目录存在本人署名研究；Uncommon Core可核查早期Bitcoin经济研究。 | Flashbots业务与MEV路线存在利益；Uncommon Core首页包含已过时的作者职务，不能照搬旧简介；需要按署名筛选。 | P1 · editorial · author-filter-needed |

### 合约安全与漏洞研究

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [samczsun](https://samczsun.com/) | 本人博客保存漏洞分析和事故响应原始文章，可沿代码/交易重建论证。 | 对具体漏洞研究有专业价值；事件严重性、损失和归因须项目/链上证据复核；不从旧报道推断当前雇主。 | P0 · editorial · blog |

### 中文安全与反钓鱼

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [余弦 / Cos](https://github.com/slowmist/Blockchain-dark-forest-selfguard-handbook) / @evilcos | 慢雾组织官方仓库明示Author Cos@SlowMist Team并链接evilcos；多语言安全手册有明确作者和方法。 | 安全事件初报需复核地址、交易和项目修复；慢雾提供商业安全服务，合作/审计不等于产品绝对安全。 | P0 · editorial_and_hot_signal · repository |

### 链上调查与反诈骗

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [ZachXBT](https://t.me/s/investigations) / @zachxbt | 本人署名Telegram公开调查频道持续链接自身X调查线程，含跨平台调查证据。 | 调查指控是作者调查，不等于司法裁判；逐条复核交易、地址归属与证据链。未验证zachxbt.live归属，排除该仿似域名。 | P0 · editorial_and_hot_signal · telegram-public |

### 合约与钱包安全

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Mudit Gupta](https://mudit.blog/) | 本人署名博客有WazirX、Wintermute、Cream、Poly Network等漏洞机制分析。 | 技术分析适用于所审查的实现和时点；初期猜测不能当最终归因；旧文多、当前职位及更新渠道另验。 | P2 · editorial · blog |

### 钱包安全与威胁情报

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Taylor Monahan](https://metamask.io/en-GB/news/taylor-monahan) | MetaMask官方本人作者页有恶意软件及安全专题。 | 本人技术分析与MetaMask官方事故通告不同；厂商关联和竞品表述需交叉证据；不沿用旧媒体职位。 | P0 · editorial_and_hot_signal · author-directory |

### DEX与DeFi产品

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Hayden Adams](https://blog.uniswap.org/uniswap-v4) | Uniswap官方本人署名v4设计文章，作者链接作为个人账号身份锚点。 | 对自己设计的AMM有一手价值；项目利益显著。初始愿景不证明当前产品上线；DAO治理不由创始人个人替代。 | P1 · editorial · authored-article |

### 借贷与RWA

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Robert Leshner](https://www.superstate.com/about) | Superstate官方当前列联合创始人及CEO，说明此前联合创立Compound Labs。 | 公司产品设计与历史机制经验可参考；RWA可得性、法域与风险须产品文件核查；不是独立评级。 | P2 · editorial · official-bio |

### DeFi架构与市场结构

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Andre Cronje](https://andrecronje.info/) / @AndreCronjeTech | 本人规范身份页列Yearn/Keep3r/ve33历史及Flying Tulip、Witnessnet当前工作；Sonic官方声明与其现身份交叉吻合。 | 个人/项目记录有一手性；投资与商业利益高。2026-06退出Sonic董事及常规参与，不能继续写Sonic现任CTO。 | P1 · editorial · blog |

### Web3投资与网络经济

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Chris Dixon](https://cdixon.org/) | 个人站与About提供a16z crypto投资身份及网络/所有权长期论述。 | VC立场和被投组合影响观点；用于投资框架与叙事，不能替代技术规范、采用数据或项目独立调查。 | P2 · editorial · blog |

### 跨生态投资与机制

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Haseeb Qureshi](https://haseebq.com/) | 本人站当前标题为Dragonfly Managing Partner，有原创加密产品、去中心化与跨生态投资论述。 | VC持仓/被投关系需跟文披露；年度价格预测降为观点而非新闻事实。 | P1 · editorial · blog |

### 加密创业与治理

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Fred Ehrsam](https://www.paradigm.xyz/team/fred-ehrsam) | 官方列Paradigm联合创始人及Senior Advisor，旧原创文章讨论治理最小化与周期。 | 本次已核验身份，但最新列表主要旧文；当前重心含Nudge。适合历史机制资料，低频监测；不写成现任GP。 | P2 · editorial · author-directory |

### 原创采访与行业调查

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Laura Shin](https://unchainedcrypto.com/about/) | Unchained官方当前列创始人/CEO、记者及节目主持人，可溯源到完整采访而非转述。 | 采访中嘉宾的主张归嘉宾；节目赞助与媒体内容分开；不是协议官方或资产推荐。 | P0 · editorial · podcast-and-interviews |

### 中文与亚洲原创报道

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [吴说 / Colin Wu](https://wublock123.com/) / @wublockchain | 中文官网、英文站、Substack和官方Linktree互链，提供亚洲监管、交易所、矿业原创采访及报道。 | Colin Wu个人与吴说编辑团队内容区分署名；媒体独家需第二证据；禁止把报道当官方政策。官网版权明确禁止未许可转载/复制/商用，须授权或仅合规链接引用。 | P0 · editorial · media-and-newsletter |

### 中文DeFi与稳定币机制

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Mindao Yang](https://medium.com/@mindao.yang) | 本人Medium自述dForce Founder，团队在Arbitrum官方论坛提案列其核心贡献者及创始人；有本人协议/事件署名。 | dForce相关内容利益直接；跨协议观点须数据/规范复核。Medium旧文多，本次不把已知X昵称猜作已验handle。 | P1 · editorial · author-directory |

### 中文与跨境投资研究

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Dovey Wan](https://medium.com/@doveywan) | 本人Medium在Primitive Ventures刊物下署名金融化信念系统及团队研究，并自述创始人身份。 | 投资机构与被投组合有利益；自述/署名可验但本次官网读取失败，现任职务和实时账号仍需官方二次锚点。 | P2 · editorial · author-directory |

### 中文Web3产品与投资

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Jason Kam / MapleLeafCap](https://www.folius.ventures/) / @Mapleleafcap | Folius官方Team直接把Founder链接到Mapleleafcap，提供中文/英文文献入口。 | 官方声明基金存在未披露的非私募敞口；研究观点与持仓须分开，不能把基金持仓文章当独立项目评级。 | P1 · editorial · writing-directory |

### 中文通证设计与标准

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [孟岩 / Mike Meng](https://eips.ethereum.org/EIPS/eip-3525) | ERC-3525最终规范的作者名单含Mike Meng；公开中文材料将其与孟岩/Solv对应，适合标准机制和中文长文线索。 | 规范作者身份的权威只适用于标准与设计；Solv相关产品有直接利益；中文名映射辅以媒体资料，不宣称本次现任职务已验。 | P2 · editorial · standard-author-anchor |

### 反方研究与政治资金追踪

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Molly White](https://www.mollywhite.net/) | 个人站列Citation Needed、Web3 is Going Just Great、Follow the Crypto及本人调查写作，提供行业风险的反方视角。 | 批判性选题有选择偏差；事件列表不等于整个行业失败；事实判断回到法院文件、监管原件与数据。 | P0 · editorial · blog |

### 密码学与学术原始研究

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Dan Boneh](https://crypto.stanford.edu/~dabo/pubs/pubs.html) | Stanford官方本人页确认计算机科学及电气工程教授、计算机安全实验室联合负责人；论文目录与区块链/密码学课程为原始研究入口。 | 权威在应用密码学、安全证明及教学；论文假设和证明范围不能外推到部署安全或代币回报，课程不等于项目背书。 | P0 · editorial · academic-publications |

### 机制设计与学术原始研究

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Tim Roughgarden](https://timroughgarden.org/chron.html) | 署名论文目录含交易费机制、PoS共识、PBS、AMM及2026研究；本人当前页列IAS数学教授、Columbia休假教授与a16z crypto研究负责人。 | 机制分析须保留数学假设；与a16z机构存在利益关联；论文结果不自动证明某实现安全或经济长期成立。 | P0 · editorial · academic-publications |

### 密码学与MEV学术研究

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Ari Juels](https://www.arijuels.com/) | 本人学术页确认Cornell Tech教授、IC3联合创办/负责人及Chainlink Labs首席科学家；Flash Boys 2.0有正式作者署名。 | 学术成果适用于论文问题；Chainlink任职构成明确项目利益，研究与产品推广分开；身份页须再定位论文更新列表。 | P1 · editorial · academic-identity-anchor |

### MEV与交易排序研究

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Phil / Philip Daian](https://research.flashbots.net/) | Flash Boys 2.0正式第一作者；Flashbots官方研究目录有其2025署名Defining Geographic Decentralisation，Ari Juels学术页链接其本人及Flashbots去向。 | 采集需按作者过滤，不能把整站归为其作品；MEV组织立场和商业利益须披露，本次不据旧学术页断言当前职称。 | P0 · editorial · research-directory-author-filter |

### 多链架构与Polkadot

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Gavin Wood](https://gavwood.com/) | 本人网站连接Yellow Paper、Polkadot原始提案与技术经历；为Ethereum形式规范及多链设计的作者原始入口。 | 历史创始经历可核；站点较静态，不据此推定今日公司职务；Polkadot/JAM路线有生态利益，技术主张须比对规范及实现。 | P1 · editorial · identity-and-original-papers |

### Solana共识与性能架构

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Anatoly Yakovenko](https://solana.com/solana-whitepaper.pdf) | Solana官网托管本人署名原始白皮书；官网Proof of History文章有其完整技术说明与Solana Labs联合创始人身份。 | 白皮书是历史技术设计，不能当成当前Agave/Alpenglow规范或实测TPS；Solana创始人立场须与客户端数据交叉；个人持续内容入口待补。 | P2 · editorial · signed-whitepaper-anchor |

### Solana基础设施与产品

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Mert Mumtaz](https://www.helius.dev/about) | Helius官网确认现任联合创始人及CEO，说明其工程经历与当前负责方向；可用于核对其原始访谈和基础设施经验。 | 身份入口已验，但Helius团队博客不能全归到其本人；与Solana基础设施业务有直接利益；个人署名列表/X需另验，先取访谈与有署名原件。 | P2 · editorial · company-identity-anchor |

### L2与Base产品方向

| 人物与入口 | 接入理由 | 权威边界与冲突 | 建议 |
|---|---|---|---|
| [Jesse Pollak](https://www.ycombinator.com/blog/author/jesse-pollak) | YC官方作者目录保留其联合署名YC x Coinbase RFS；Coinbase官方2024业绩电话会议涉及其Base及Wallet管理职责，构成原始身份与表述锚点。 | 2024管理角色仅为历史锚点，当前职务待官网更新；YC合作署名不是全部个人作品；Base/相关创业投资有商业立场，不把生态愿景当增长事实。 | P2 · editorial · official-authored-directory |

## 条件观察目录

不把下面的人一律评为不可信；降级理由是内容类型、商业利益、活跃入口或身份链暂未满足9BTC的事实编辑要求。名字的知名度不能补齐证据缺口。

| 人物与已发现入口 | 有价值的观察范围 | 限制与下一步 | 使用方式 |
|---|---|---|---|
| [Arthur Hayes](https://cryptohayes.substack.com/) | 本人Crypto Trader Digest持续长文；自述Maelstrom CIO及BitMEX前CEO。 | 可研究衍生品和流动性框架；价格/时点预测和谈及持仓仅算观点，不能给新闻自动背书。 已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测 | hot_signal_only |
| [Cobie](https://cobie.substack.com/about) | 本人Substack及Paradigm官方Advisor身份可核查。 | 讽刺、匿名爆料、持仓与顾问关系需隔离；单条爆料需原始证据后再入稿。 已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测 | hot_signal_only |
| [David Hoffman](https://www.bankless.com/author/david-hoffman) | Bankless本人作者页及节目，含持仓/天使投资/顾问披露。 | 明确观点内容和赞助；官方披露页本身可能滞后，不能推断实时持仓；采访可用，资产观点隔离。 已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测 | editorial_interviews_only |
| [Ryan Sean Adams](https://www.bankless.com/author/ryan) | Bankless本人作者页可核查署名及商业利益披露。 | 多个被投/顾问关系，个人观点与独立采访区分；不把同一Bankless团队两名主持算两个独立证据。 已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测 | editorial_interviews_only |
| [Anthony Sassano](https://thedailygwei.substack.com/about) | The Daily Gwei本人刊物About及项目报告中的创始人身份可核查。 | ETH生态立场强；技术解释需对照规范；旧thedailygwei.com已停放，不采集该域。 已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测 | hot_signal_only |
| [Evan Van Ness](https://weekinethereum.substack.com/) | 本人2025-01-01公告Week in Ethereum已结束；Substack现有个人内容。 | 旧周报不作活跃自动信源；现有收益/交易推荐与历史开发周报不是同一编辑产品。 已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测 | manual_observation_only |
| [愉悦 / Yuyue](https://www.binance.com/en-BH/square/profile/yuyue_chris) | 公开自发表Square页面可观察中文叙事、空投及交易讨论。 | 自报回报/排名不作为能力证据；利益和地址归属未系统验证。只作热点线索，不升格权威。 公开自发表页面已检索；跨平台本人身份链、X与实盘数据未验 | hot_signal_only |
| [Haotian / 链上观](https://www.panewslab.com/zh/articles/sb40q2ni4rat) | 本人受访自述研究经历，PANews有持续署名技术/产品长文。 | 这是作者观点与采访自述；历史PeckShield/Amber职位未独立向雇主确认，项目推荐过滤，技术主张回到代码/论文。 本人受访自述与多篇署名可读；当前职务/商业关系/X身份锚点待补验 | hot_signal_only |
| [0xTodd](https://www.gate.com/news/detail/17777767) | 2026访谈署名及受访者介绍可发现EBunker/Nothing Research研究线索。 | 此次只有访谈转载，不能证实现任职务/个人账号；不使用同名空GitHub作为身份锚点；暂不接入采集。 仅采访转载可检索；官方任职/本人入口/X身份锚点未验 | identity_verification_required |
| [神鱼 / 毛世行](https://www.cobo.com/zh/about) | Cobo官网当前列联合创始人及CEO，并说明F2Pool共同创立经历。 | 公司历史与托管设计可作一手采访；收益策略、产品推广有直接利益；个人X入口未验证。 已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测 | editorial_interviews_only |
| [王超 / Wang Chao](https://www.techflowpost.com/en-US/article/19362) | 2024完整访谈保存本人关于Metropolis DAO及投资机制的自述。 | 采访为历史身份锚点，当前角色/官方个人入口未验；DAO投资偏好是个人意见，并非DAO官方立场。 本人访谈历史自述已检索；现任身份、个人渠道及X待补验 | identity_verification_required |
| [Willy Woo / Woobull](https://woobull.com/) | 可读Woobull博客/模型站，适合补充Bitcoin链上定价假设。 | 指标定义、模型回测与实时个人账号需补验；投资价格判断与链上原始数据严格分开；目前仅候选。 Woobull网站可读；本次未完成个人身份链及最新数据/模型准确性验证 | identity_verification_required |

## 9BTC应该怎样用个人信源

先用“规范/代码/原始数据—技术研究—采访/解释—热点讨论”四层来理解一个议题。KOL作者页作为身份锚点，所有具体事件仍保存文章原文URL、发布日期、抓取时间、作者与所属机构。同一作者在博客、X、Telegram和媒体转载里的重复发言只算一次；同一编辑团队、同一被投项目稿件也不能作为多个独立验证者。

技术主张回到EIP、BIP、代码提交、客户端版本和实验方法；开发会议回到录像与议程；漏洞回到交易/项目修复报告；监管回到监管原件；价格、收益、代币推荐和匿名“内部消息”进入隔离观察。含钱包连接、空投、推荐码、拉群或买入指令的内容不能原样进精选。

观点发布应写“作者提出/认为”，事实发布写“官方发布/规范已合并/交易显示”，上线结论必须单独验证。即使是Vitalik或协议创始人，也不取消这条边界。市场预测可以当研究假设记录，可检验时点与条件必须保留；当前目录没有用预测命中率给人物背书。

本目录也刻意保留互相竞争的观点：Bitcoin协议与自托管、以太坊扩容、支付链/Tempo、MEV组织、投资者框架、中文区域视角和Molly White的反方研究。价值在于增加可检验的论据，不能按生态站队给来源加分。

## 单项证据索引与接入验收

机器目录JSON为每名人物保存`evidenceUrls`、`verification`、`selected`、`entryType`、`priority`、`participationMode`。这些是研究字段，未承诺与现有生产schema兼容。下一步逐源验收：身份反向互链；稳定内容入口；RSS/API/HTML的实际解析；最近三篇文章与更新周期；原文/摘要版权；商业利益和同源归组；测试样本是否真正有新增内容。没有通过者维持候选。

- **Vitalik Buterin**：[证据1](https://vitalik.eth.limo/)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Jameson Lopp**：[证据1](https://blog.lopp.net/) · [证据2](https://www.lopp.net/)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Peter Todd**：[证据1](https://petertodd.org/)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Matt Corallo / BlueMatt**：[证据1](https://bluematt.bitcoin.ninja/about/) · [证据2](https://spiralxyz.substack.com/p/were-breaking-up)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Adam Back**：[证据1](https://blockstream.com/about/) · [证据2](https://blog.blockstream.com/author/adam-back/)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Nic Carter**：[证据1](https://niccarter.info/)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Lyn Alden**：[证据1](https://www.lynalden.com/) · [证据2](https://www.lynalden.com/about-lyn-alden/)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Andreas M. Antonopoulos**：[证据1](https://aantonop.com/)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Dankrad Feist**：[证据1](https://dankradfeist.de/) · [证据2](https://dankradfeist.de/about/)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Tim Beiko**：[证据1](https://notes.ethereum.org/@timbeiko)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Justin Drake**：[证据1](https://blog.ethereum.org/2025/07/31/lean-ethereum)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Barnabé Monnot**：[证据1](https://barnabemonnot.com/)。本人历史站点已读取；当前职务、最新内容入口、X账号锚点及RSS待补验。
- **Ben Edgington**：[证据1](https://benjaminion.xyz/) · [证据2](https://eth2book.info/latest/) · [证据3](https://consensus.ethereum.foundation/)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Christine D. Kim**：[证据1](https://christinedkim.substack.com/about) · [证据2](https://www.galaxy.com/authors/christine-kim)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Dan Robinson**：[证据1](https://www.paradigm.xyz/team/dan-robinson)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Georgios Konstantopoulos**：[证据1](https://www.paradigm.xyz/team/georgios-konstantopoulos)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Tarun Chitra**：[证据1](https://www.gauntlet.xyz/team) · [证据2](https://arxiv.org/abs/2001.00919) · [证据3](https://arxiv.org/abs/2403.02525)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Hasu**：[证据1](https://research.flashbots.net/) · [证据2](https://uncommoncore.co/)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **samczsun**：[证据1](https://samczsun.com/)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **余弦 / Cos**：[证据1](https://github.com/slowmist/Blockchain-dark-forest-selfguard-handbook) · [证据2](https://evilcos.me/)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **ZachXBT**：[证据1](https://t.me/investigations) · [证据2](https://t.me/s/investigations?before=172)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Mudit Gupta**：[证据1](https://mudit.blog/)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Taylor Monahan**：[证据1](https://metamask.io/en-GB/news/taylor-monahan)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Hayden Adams**：[证据1](https://blog.uniswap.org/uniswap-v4)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Robert Leshner**：[证据1](https://www.superstate.co/) · [证据2](https://www.superstate.com/about)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Andre Cronje**：[证据1](https://andrecronje.info/) · [证据2](https://www.soniclabs.com/blog/leadership-update-from-sonic-labs/)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Chris Dixon**：[证据1](https://cdixon.org/) · [证据2](https://cdixon.org/about/)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Haseeb Qureshi**：[证据1](https://haseebq.com/)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Fred Ehrsam**：[证据1](https://www.paradigm.xyz/team/fred-ehrsam)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Laura Shin**：[证据1](https://unchainedcrypto.com/about/)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **吴说 / Colin Wu**：[证据1](https://wublock123.com/) · [证据2](https://www.wublockchain.xyz/) · [证据3](https://wublock.substack.com/about) · [证据4](https://linktr.ee/wublockchain)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Mindao Yang**：[证据1](https://medium.com/@mindao.yang) · [证据2](https://forum.arbitrum.foundation/t/dforce-final-stip-round-1/16988)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Dovey Wan**：[证据1](https://medium.com/@doveywan)。本人公开Medium署名及创始人自述已读取；机构官网不可读，当前职务及X待补验。
- **Jason Kam / MapleLeafCap**：[证据1](https://www.folius.ventures/) · [证据2](https://www.huttcapital.com/episode-30-jason-kam-folius-ventures)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **孟岩 / Mike Meng**：[证据1](https://eips.ethereum.org/EIPS/eip-3525) · [证据2](https://www.panewslab.com/zh-hant/articles/ttgv74yhkf07)。EIP作者一手锚点已读取；中文名映射为公开媒体/署名辅助；持续个人发布入口与X待补验。
- **Molly White**：[证据1](https://www.mollywhite.net/)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Dan Boneh**：[证据1](https://crypto.stanford.edu/~dabo/) · [证据2](https://crypto.stanford.edu/~dabo/pubs/pubs.html)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Tim Roughgarden**：[证据1](https://timroughgarden.org/) · [证据2](https://timroughgarden.org/chron.html)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Ari Juels**：[证据1](https://www.arijuels.com/) · [证据2](https://arxiv.org/abs/1904.05234)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Phil / Philip Daian**：[证据1](https://arxiv.org/abs/1904.05234) · [证据2](https://research.flashbots.net/) · [证据3](https://www.arijuels.com/)。论文署名和官方2025研究目录已读；pdaian.com本次工具不能读取；当前职称与个人X未验。
- **Gavin Wood**：[证据1](https://gavwood.com/) · [证据2](https://arxiv.org/abs/2005.13456)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Anatoly Yakovenko**：[证据1](https://solana.com/solana-whitepaper.pdf) · [证据2](https://solana.com/el/news/proof-of-history)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Mert Mumtaz**：[证据1](https://www.helius.dev/about) · [证据2](https://www.helius.dev/blog)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Jesse Pollak**：[证据1](https://www.ycombinator.com/blog/author/jesse-pollak) · [证据2](https://investor.coinbase.com/files/doc_financials/2024/q3/Q3-24-Analyst-Q-A-Call-Transcript.pdf)。YC作者页及Coinbase官方历史电话会议原件可读；未核2026现任头衔、个人持续渠道与X。
- **Arthur Hayes**：[证据1](https://cryptohayes.substack.com/)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Cobie**：[证据1](https://cobie.substack.com/about) · [证据2](https://www.paradigm.xyz/team/cobie)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **David Hoffman**：[证据1](https://www.bankless.com/author/david-hoffman)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Ryan Sean Adams**：[证据1](https://www.bankless.com/author/ryan)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Anthony Sassano**：[证据1](https://thedailygwei.substack.com/about) · [证据2](https://docs.arbitrum.foundation/assets/files/ArbitrumFoundationTransparencyReport2025-3ac117dd3203dbe7bca401cf951f0c14.pdf)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **Evan Van Ness**：[证据1](https://weekinethereum.substack.com/p/week-in-ethereum-has-ended-heres) · [证据2](https://weekinethereum.substack.com/)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **愉悦 / Yuyue**：[证据1](https://www.binance.com/en-BH/square/profile/yuyue_chris)。公开自发表页面已检索；跨平台本人身份链、X与实盘数据未验。
- **Haotian / 链上观**：[证据1](https://www.panewslab.com/zh/articles/sb40q2ni4rat) · [证据2](https://panews.io/articles/143d6671-f938-48bf-b398-6da380280b02)。本人受访自述与多篇署名可读；当前职务/商业关系/X身份锚点待补验。
- **0xTodd**：[证据1](https://www.gate.com/news/detail/17777767)。仅采访转载可检索；官方任职/本人入口/X身份锚点未验。
- **神鱼 / 毛世行**：[证据1](https://www.cobo.com/zh/about)。已读取本人/机构公开页面；身份或署名可核对；RSS与X时间线未实测。
- **王超 / Wang Chao**：[证据1](https://www.techflowpost.com/en-US/article/19362)。本人访谈历史自述已检索；现任身份、个人渠道及X待补验。
- **Willy Woo / Woobull**：[证据1](https://woobull.com/)。Woobull网站可读；本次未完成个人身份链及最新数据/模型准确性验证。
