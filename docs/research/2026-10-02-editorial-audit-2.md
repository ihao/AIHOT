# 2026-10-02 待审核内容复核：分片 2

本次覆盖 `shard-2.json` 的全部429条唯一内容：通过 300 条、拒绝 129 条、保留待查 0 条；其中 102 条附中文标题或摘要修稿。全部 `curated=false`，没有强行精选。结果保存于 `site/.data/review-2026-10-02/results-2.json`，每条包含具体审核说明和材料说明。

## 方法与证据范围

逐项核对导出快照中的中文标题、摘要、原始标题/作者/发布日期元数据，以及与主张对应的正文段落。长文按事实对象、数字单位、统计分母、时间、治理和交付阶段、归因、安全修复状态等主张回看上下文；并审阅自动验证及历史决策中更具体的原因。没有以终止阶段的 `no_new_primary_evidence` 或关键词代替语义判断。

这批409条保存正文，20条正文为空或未确认；通过项均有保存正文。第一方对自身公告、作者对自身研究或观点的陈述，可以支持相应的“宣布、提出、认为、报告称”；这不自动证明外部事件、链上指标、法律结论或所有安全效果。第三方严重事故与监管结论缺对应原始材料时，拒绝的是当前可发布稿的证据充分性。

按 `industry/prompts/prefilter.md` 复查实质Web3关系。来源已获批或机器相关性通过不等于每篇相关：泛金融、通用AI/软件教程、普通招聘，只有正文具体说明与数字资产、链上机制、协议或预测市场的关系才保留。

历史资料保留可确认的年份或观察期。缺少 `published_at` 的通过项，不更改数据库日期：将“即将、数日内、目前”等锚定为公告当时的计划或公告所述状态。还复查了全部74条曾经只改摘要未改标题的通过项，同步修正遗留的核心对象、阶段、数量和时效歧义。公开文案只写具体新闻信息，审核流程和证据边界留在审核说明。

## 代表性处理

表内链接定位本次导出所对应的存储原文。下列为具体案例，不是对每一类材料的机械通行或拒绝规则。

| 内容与原始来源 | 问题 | 处理说明 |
| --- | --- | --- |
| [以太坊交易图六年研究：86个异常簇中约85%对应现实事件](https://ethresear.ch/t/the-shape-of-ethereum-a-six-year-study-of-topological-anomalies/25902)（`nvtr5gio63qn6b4v4xtp6dy5e`，通过） | 数量变成比例 | 原稿把73个写成73%；原文为86个异常簇中73个对应现实事件，约85%。同时保留合并相邻异常后的样本单位。 |
| [Filecoin存储提供者CC扇区升级成本模型指南](https://filecoin.io/zh-cn/blog/cc-sector-upgrade-guidelines-and-modeling)（`rif6m28bu2e7g7oa0x52bexdg`，通过） | 差额变成绝对费用 | 每32GiB约0.05美元是升级现有CC扇区与新增交易扇区的成本差额，统计基准为2023年7月7日，不是升级总价。 |
| [Balancer DAO 提议分配 V1 漏洞攻击追回的约 296 ETH 以赔付受影响用户](https://forum.balancer.fi/t/bip-xxx-distribution-of-recovered-funds-from-balancer-v1-august-31st-2026-exploit/7111)（`zwsqotpfq4kd0ldphpweymhyi`，通过） | 追回额、被盗估值与治理阶段 | 追回296.401711 ETH；约139万美元为攻击时被盗代币总值。分配仍为治理提案，未写成全部追回或赔付已执行。 |
| [Blockstream 发布 Liquid 事件报告：约4000 LBTC无支持增发，攻击者返还3400 BTC](https://blog.blockstream.com/liquid-network-security-incident-assessment/)（`azv9c54ecm245wef5hajkd94d`，通过） | 资产与攻击机制 | 约4000 LBTC是无支持增发，3400 BTC为攻击者返还；不能统称约4000 BTC直接被盗。 |
| [Sui直播链下通道实验峰值达608.6万TPS，关闭后结算主网](https://www.sui.io/blog/sui-processes-over-6-million-transactions-per-second-in-ai-agent-livestream-experiment)（`qegy55llcnbdhc3oicr1n5m0m`，通过） | 链下吞吐与主网吞吐 | 6086766 TPS来自可编程隧道链下通道实验，关闭通道后才结算到主网。标题与摘要同步限定实验及峰值口径。 |
| [Sui Basecamp 2026计划10月7—8日于新加坡举行，并挑战链下隧道实验TPS纪录](https://www.sui.io/blog/the-agentic-economy-takes-sui-basecamp-2026-singapore)（`wvp04txe9p1e0zqyl6shhqzg9`，通过） | 活动计划 | 10月7—8日活动和现场挑战属于主办方计划；标题同步注明此前纪录来自链下隧道实验。 |
| [开发者提出结合 BLISK 与 MercuryLayer 的机构支出策略方案](https://delvingbitcoin.org/t/institutional-grade-spending-policies-for-statechains/2874)（`p5nnl4n79zy9pzfrz891lhf5q`，通过） | 计划变成交付 | BLISK是拟议方案；修为结合MercuryLayer的机构支出策略提案，没有声明生产集成完成。 |
| [covenants.diy：支持 Taproot 与多种 BIP 提案的开源 Covenant 脚本节点编辑器](https://delvingbitcoin.org/t/covenants-diy-a-node-editor-for-covenant-scripts/2826)（`dm8qx4e57jsswq45zxmb9kicv`，通过） | 实验支持变成协议激活 | 提案操作码在covenants.diy浏览器编辑器中得到实验支持，不表示Bitcoin主网激活相关BIP。 |
| [Erigon 团队申请成为 Lido Curated Module 公共产品运营商](https://research.lido.fi/t/path-to-curated-module-as-public-good-operator/11785)（`yx31ha7t40hqg1syse381mhmt`，通过） | 模块对象错位 | Erigon已有500验证者密钥是在CSM；加入Curated Module是申请事项，不是已在CMv2运营。 |
| [美国合众银行在Stellar完成USBDC稳定币首笔跨境试点交易](https://stellar.org/blog/ecosystem/a-bank-issued-stablecoin-moves-real-money-on-stellar)（`cx1xhv7gg7f4f4nsc29tcwpnp`，通过） | 机构同名误译 | U.S. Bank译为美国合众银行，避免与Bank of America混淆；USBDC仍按公告所述跨境试点定位。 |
| [LlamaRisk 发布 Coinbase B20 代币化股票技术与合规审查报告](https://governance.aave.com/t/coinbase-b20-equities-on-base-assessments/25690)（`p0waze6fgg7837ry93avsrp8s`，通过） | 术语与法律边界 | B20的unvested持有者改为未归属持有者；保留LlamaRisk技术/合规报告归因，不把分析写成监管裁定。 |
| [Immunefi 称完成 Sensiba 执行的 SOC 2 Type II 鉴证](https://immunefi.com/blog/company-announcement/soc-2-type-ii/)（`hsqyr8m5jfzj2641ba3rnmdkl`，通过） | 鉴证与认证 | SOC 2 Type II attestation改为鉴证，保留Sensiba执行及Immunefi公告归因，不扩大为监管认证。 |
| [Immunefi 发布 2024-2025 链上黑客攻击真实成本研究报告](https://immunefi.com/blog/research/what-an-onchain-hack-actually-costs-2024-2025-update/)（`blxwmuk5rfzzd5x42yi3aipma`，通过） | 不同样本口径 | 2024—2025年191事件平均被盗2450万美元（约2500万美元有原文依据）；425为两期合并事件数；61%为同期82种代币六个月跌幅中位数。 |
| [Glassnode Market Compass：宏观驱动综合评分升至25/100，比特币现货ETF连续八日净流入](https://research.glassnode.com/market-compass-2026-08-11/)（`rq4y43y4soy15ne64zedxpji6`，通过） | 比较区间与指标 | 综合评分25/100高于一周前21、一月前22；宏观13至23是月度变化。模型与ETF分别连续八交易日，不能混作单一指标。 |
| [SEC起诉多家实体涉嫌通过WhatsApp等平台实施至少1500万美元欺诈](https://www.sec.gov/newsroom/press-releases/2026-95-sec-charges-multiple-entities-fraud-schemes-totaling-least-15-million-used-whatsapp-other-platforms)（`qcsshw3j77z8mryke4dd2ate5`，通过） | 指控与判决、合计金额 | SEC两案指控金额分别超过1250万和280万美元，合计至少1500万美元正确；保持起诉/涉嫌表述。 |
| [CFTC：佛州南区法院对两名被告下达同意令，因商品池欺诈需支付逾50万美元并禁止交易](https://www.cftc.gov/PressRoom/PressReleases/9294-26)（`a3si4usr16wvgf66hjyim4d9n`，拒绝） | 准确但不属选题 | 普通商品池欺诈同意令的金额合计逾50万美元正确，但全文没有实际数字资产、链上或预测市场联系，按选题范围拒绝。 |
| [Alpha Pulse 发布 Aura Finance 多模型安全初审：四个 LLM 标记的“严重”漏洞经源码验证被证伪](https://forum.balancer.fi/t/alpha-pulse-public-multi-model-security-first-pass-of-aura-finance-balancer-v2-gauge-built/7023)（`q98j17s9pebb8idfcq6vqnx7j`，拒绝） | 错误归因与推广 | AI代理source-reading初审被添写为人工源码核验，同时推广收费服务；安全结论材料不足，拒绝该稿而非断言漏洞真实存在。 |
| [Morpho Vault 安全：风险、漏洞类别与最佳实践](https://www.halborn.com/blog/post/morpho-vault-security-risks-vulnerability-classes-and-best-practices)（`hrgakpmsid6lpstlu2gxiiuif`，拒绝） | 正文缺失 | 该条及同批Halborn的16条条目缺正文，无法核对具体风险与控制措施；按材料不足拒绝，并未认定报告不存在。 |
| [Monero 发布 v0.18.5.1 'Fluorine Fermi' 版本，修复大量 Bug 并更新 RandomX](https://www.getmonero.org/2026/07/08/monero-0.18.5.1-released.html)（`mto8gf6hmm86p1jsogegd3dtv`，通过） | 机器忽略元数据 | Fluorine Fermi在原始发布标题中直接可见。机器只检索正文的缺失判断不能推翻标题元数据。 |
| [Phantom 宣布支持 Monad 主网，用户可在钱包内探索生态并交易代币](https://phantom.com/learn/blog/monad-on-phantom)（`b9eej14rsykiw997j9ha0fxeo`，通过） | 机器误判日期 | 2025年11月24日见原始标题和published_at；中文日期并非编造。仍按历史功能公告审阅。 |
| [欧洲银行管理局发布关于管理第三方风险的最终指南](https://www.eba.europa.eu/publications-and-media/press-releases/eba-publishes-its-final-guidelines-management-third-party-risk-delivering-more-proportionate-and)（`sj9nxjkd6wvm9mdglykcko2fm`，通过） | 实质Web3联系 | 最终第三方风险指南的原文明确列MiCAR第34条为法律基础；摘要补出该具体加密监管联系，避免只依赖来源获批。 |
| [[RFC] 提议在 Gensyn L2 部署 Uniswap V3，由 GFX Labs 执行](https://gov.uniswap.org/t/rfc-deploy-uniswap-v3-on-gensyn/26050)（`zb0qyz62dg7a8d3t1twg4kozv`，通过） | 测试代币量与计划时点 | Gensyn RFC中的$TEST交易量不作现实美元成交额。保留2026年3月提案当时计划4月上线、测试网验证阶段。 |

## 结果边界与交付

本轮使用用户提供的后台导出正文和元数据，没有重新抓取外部网页，也没有声称已经阅读链接背后的独立论文、链上合约、判决书或实测系统。链接用于追溯快照来源，不表示网页当前状态已重新确认。正文很长的材料重点核对中文稿所使用的事实段落和对应上下文，本轮不等同于全文法律审查、安全审计或每个指标的独立复算。

拒绝说明区分错译/对象或阶段误写、推广、材料不足和不符合选题，避免把“无法支持当前稿件”写成“原文虚假”。通过说明也保留作者、公告、报告或提案归因，尤其不把提案当执行、测试当上线、事故估值当追回金额。

已校验429个结果ID与原分片逐项一一对应、无重复、无遗漏；状态字段合法，`curated`均为false，审核说明均未超过1700字符。所有变更仅是审核结果和这份说明，未写入生产。生产合并应按原始版本/指纹复核后应用对应修稿与理由，防止覆盖后续内容更新。
