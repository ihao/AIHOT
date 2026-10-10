# 2026-10-02 待审核内容原文复核：分片 1

## 范围与结果

本分片共 **429 条**，逐项形成审核决定：**294 条通过、135 条拒绝、0 条保留待核**。其中 **145 条包含标题或摘要修正**；全部 `curated=false`，没有强行加入精选。通过的历史资料有78条，保留原始发表日期，并对容易被读成现时状态的“目前”“将于”等表述补充历史时点。

逐条完整说明见 `site/.data/review-2026-10-02/results-1.json`。本次仅保存审核结果和研究记录，未调用生产审核接口，未发布内容。

## 核对方法与证据边界

以导出的存档 `body_text` 为原文材料，逐项比对中文标题、摘要、发表日期及摘要相关段落；涉及数字、范围、部署阶段、任命或投票结果时，再查阅相应原文段落、表格和论坛回复。每条结果分别写明具体对象、证据与不足；不把机器 `no_new_primary_evidence` 或 `quote_invalid` 标签直接作为最终决定。

第一方对自身产品、治理提案、作者观点及实际技术分析，可支持对应主张；不能借机构身份证明第三方监管、上市、重大失窃或其他事件已经成立。小修用新闻文风保留来源归因、日期、测试/草案阶段和有用的统计口径。审核流程与独立核验边界放在后台 `reason`/`evidenceNotes`。

另按 `site/industry/prompts/prefilter.md` 检查实际Web3关系。泛金融政策、一般AI开发、普通CI或硬件安全不能仅凭发布方身份放行；相关而主要是报名、收益使用引导或供应商优势宣传的稿件，按材料质量分别处理。

大部分判断仅基于本次供应的原文存档，未声称实时网页重新核查。唯一补充外部核对是 Nasdaq Basic 产品定义：通过网页搜索读取 Nasdaq 官方产品说明。尝试 agent-reach 的 Jina 网页读取未返回正文，因此不将其记作成功读取。官方说明将 Basic 定义为最优报价与最新成交，完整订单簿另属 TotalView。[Nasdaq Basic](https://www.nasdaq.com/products/data/equities/nasdaq-basic)、[Nasdaq TotalView](https://www.nasdaq.com/products/data/equities/nasdaq-totalview)。

拒绝意味着当前材料或文案不够支持发布；除已明确核定的译写/口径错误外，不等于断言原报道虚假。

## 代表发现

| 对象 | 处理 | 原文核对发现 |
| --- | --- | --- |
| a16z RWA永续与代币化股票数据 | 修正通过 | 保留平台追踪范围和2026年8月时点；代币转账不等于交易成交。 |
| Bitcoin Core 0.13.1 | 修正通过 | Segwit锁定条件是一个2016区块周期内95%信号，之后再等一个周期激活，中文原稿把信号期写错。 [原发行说明](https://bitcoincore.org/en/releases/0.13.1/) |
| Compound四类资产抵押配置 | 修正通过 | 原文为七个抵押配置/市场，不是七种不同代币。 |
| IPFS Optimistic Provide | 修正通过 | 15秒至0.7秒是ProbeLab测量，10倍有原文依据，但标题须加测试范围，不当作所有网络的确定改善。 |
| Art Gobblers | 修正通过 | VRGDA控制空白页等NFT发行节奏，Goo由Gobblers产生；原摘要误称VRGDA控制Goo发行。 [设计说明](https://www.paradigm.xyz/writing/artgobblers) |
| Phantom ISAC成员 | 修正通过 | `first charter member`不是既有`founding members`之一；纠正首家创始成员译法。 [项目公告](https://phantom.com/learn/blog/phantom-new-head-of-security-joins-crypto-isac) |
| Sui后量子方案 | 修正通过 | 核心已开发/基准测试，金库和原生认证仍有测试网、主网排期，不能写成已部署。 [技术文章](https://www.sui.io/blog/suis-post-quantum-signature-schemes) |
| Uniswap Foundation FY2025 | 修正通过 | 8580万美元是代币市值，另有4990万美元现金/稳定币；12月26日提案通过后的组织调整实施前，不是提案通过前。 [未经审计财务摘要](https://gov.uniswap.org/t/uniswap-foundation-summary-fy-2025-financials/26068) |
| Pyth Nasdaq Basic | 拒绝 | 原稿把Basic与全深度产品能力混淆，与Nasdaq官方说明不符。 [待审原稿](https://www.pyth.network/blog/institutions-on-pyth-building-the-price-of-everything-everywhere) |
| Halborn 15篇安全条目 | 拒绝 | 存档正文全部为空，不能核对具体漏洞、协议阶段或威胁模型；没有借标题假定细节。 |
| CFTC被动软件无行动函、一般吹哨奖励 | 拒绝 | 原文为泛金融执法政策，与具体数字资产/预测市场无关系；数字资产Fundsz案件则按官方原文通过。 |
| Centaur、普通Docker/CI/VM文章 | 拒绝 | 主要讨论通用企业AI运行时、HTML演示、GitHub Actions或虚拟机安全，没有具体Web3关系。 |
| Bitget、Pons欺诈、Galaxy多篇安全及监管转述 | 拒绝 | 存档只提供二手叙事，缺可核对的原始公告、交易调查或监管文件，不以叙事完整替代证据。 |
| FomoPeek恶意模块 | 修正通过 | 慢雾是实际样本分析方；补充远端利用开关测试时为关闭、实验室Hook开启后的链路，区分能力和现场活跃情况。 [分析报告](https://slowmist.medium.com/threat-intelligence-analysis-of-fomopeek-app-store-poisoning-and-ios-kernel-exploitation-e568762d11ca) |

## 完整性检查

- 源分片与结果都是429条，ID集合、唯一性及顺序完全一致。
- 每条包含非空中文`reason`及`evidenceNotes`，429条原因均唯一；最大原因长度120字符，低于1700限制。
- 无拒绝/待核条目携带批准文案修正，全部精选标记为false。
- 修正摘要已检查并移除本次审核、未独立核验等流程性措辞，保留必要的时点、阶段和数据范围限制。
