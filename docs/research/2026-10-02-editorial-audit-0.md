# 2026-10-02 编辑审核：分片 0

## 范围与结果

本报告覆盖生产待审核快照分片 `shard-0.json` 的全部 429 条，不写生产数据库。审核结果保存在 `.data/review-2026-10-02/results-0.json`：338 条批准、91 条驳回、0 条暂缓，全部 `curated=false`。120 条含中文标题或摘要修正，其中 115 条修摘要、30 条修标题；两者可重叠。

每条均保存唯一 ID、决定、具体中文说明和证据备注。已检查 ID 集合与分片完全一致、无遗漏重复、决定值和说明长度符合约束；最长 reason 为153字符。公开修正文案已移除本次审核、独立核验能力等流程语言。历史内容保留原时间范围，无日期原文不把其阶段写成审核当天的当前状态。

## 方法与边界

逐项读取中文标题、完整中文摘要、原始正文的开头、与主张有关的原文证据及上下文。长论坛讨论、论文和综述按每个核心主张定位相关段落，必要时再读版本、金额、阶段或结论附近文本；没有声称逐字审读所有长正文，也没有把存储的自动 verdict 当作决定。核对内容包括主体、作者归因、数字/单位、发布时点、提案/测试/部署阶段、营销和 Web3 选题范围。另看终止前 decision reasons，区分 `no_new_primary_evidence` 终止标记与更早的真实缺证、错误摘引、中文偏差。

第一方对自身公告、作者原始技术研究和本人意见，可作为对应主张的原始来源；“source获批”“first_party标记”“relevance=pass”均不能证明每篇事实充分或相关。第三方事故、外部执法、证券上市等具体结论，如没有已读原始证据，按该摘要证据不足驳回。驳回不等于判定事件虚假。空正文也不直接等于无关，但不能批准无法对照的安全事故事实。

本分片的主要证据为导出的原始正文。Bitget 补证由根审核实际读取并提供，备注明确是联合审核补证，不冒充本分片独立网络读取。未访问的外链不写成已核查来源。

Web3 相关性按 `industry/prompts/prefilter.md` 复查。具体链上身份/支付/权限、Canton智能合约测试和去中心化GPU应用可相关；普通监管实体关联规则、泛AI补丁基准、AWS KMS通道和CompleteFTP主机密钥研究，在材料未给出具体Web3连接时不收录。不会仅因其发布方是加密公司或安全公司放行。

## 代表发现

| 对象 | 判断与修正 |
| --- | --- |
| a16z观点和历史预测市场统计 | 保留作者归因、6月25日文章口径；$14.4B等中文换算本身正确，不能机械按amount冲突拒绝；36亿美元约为2亿美元的18倍。 |
| OpenReserve / Aave V4 | 链上金库和开发者协议为未来方向；Aave V4 collateral factor不同于V3 LTV/清算阈值；启动时仅Ethereum不等于2026年现有网络范围。 |
| Compound储备报告 | 转为COMP与“没有任何交易”冲突；原意为没有自由裁量或投机交易，应缩小中文范围。 |
| Lopp量子安全文章 | 暴露的是公钥而非私钥；另一条摘要把作者支持宽限期后冻结旧币的立场颠倒，驳回而非仅改措辞。 |
| SushiSwap MISO | 10.9万余ETH是当时面临风险的数量，不是已被盗；标题改为漏洞救援，避免手动结束拍卖被写成完成源码补丁。 |
| Bitget / Halborn | Halborn原始存储正文为空；联合补证支持有归因的估计与初步机制，金额不写成最终损失，热/温钱包不缩成仅热钱包。 |
| Phantom产品 | earnings markets应为财报市场；导入助记词/私钥管理现有地址不等于转移资产；即时报价限于聚合市场，不保证全市场最佳；2022年的下周补丁计划注明当时日期。 |
| Polkadot社交汇总 | W3F对Referendum投AYE不等于公投通过；多条自动日报缺少可读原始发布/治理/证券上市材料，按具体证据不足驳回。 |
| Polygon Agent支付 | 25个Hub超过1100万/秒测的是链下签名支付更新，20微秒为引擎处理且另加网络延迟；不得充作Polygon主链TPS。 |
| Spark SAEP-22 | 时间锁在投票预计结束后至少24小时到期，原中文写成结束前，方向相反；已修正提案条件。 |
| Stellar / USDT0 | USDT整体市值不能作为Stellar已获得的流动性或USDT0自身市值；保留实际网络集成，删去放大口径。 |
| Wormhole / BUIDL | 原文称九链却只列八链，去掉数量；基金规模锚定2025年11月11日，删去服务商累计跨链规模推介。 |

## 可定位的原始材料

- [a16z 原始观点文章](https://a16zcrypto.com/posts/article/blockchains-create-net-new-markets)：本分片存储的原始作者文章，逐项URL保留在分片快照；批准的是明确归因的观点和其报告口径。
- [Polygon Agent支付测试](https://polygon.technology/blog/polygon-11-million-agent-payments-per-second)：存储正文直接写明独立Hub支付更新与链上结算分离。
- [Spark SAEP-22原始提案](https://forum.skyeco.com/t/saep-22-update-risk-curation-framework/28232)：after the poll’s expected close 的24小时限制。
- [Phantom账户导入](https://phantom.com/learn/blog/import-and-manage-multiple-wallets-with-phantom)：存储正文明确无需转移到新钱包。
- [Uniswap Compact v1](https://blog.uniswap.org/the-compact-v1)：原始合约发布、四链已部署与ERC-6909资源锁说明。
- [SEC代币化NMS股票临时豁免公告](https://www.sec.gov/newsroom/press-releases/2026-90-sec-issues-innovation-exemption-facilitate-trading-tokenized-nms-stock-request-comment)：本分片及补充存储的官方正文；与其他没有对应官方材料的二手监管转述分开判断。
- [Halborn Bitget分析](https://www.halborn.com/blog/post/explained-the-bitget-hack-september-2026)、[Bitget 9月24日公告](https://www.bitget.com/support/articles/12560603896024)、[Bitget 9月30日公告](https://www.bitget.com/support/articles/12560603896305)、[Mandiant 9月28日状态报告PDF](https://img.bgstatic.com/multiLang/events/MFR26-1029_Status_Update_Bitget_0930.pdf)：根审核已实际读取。Mandiant报告给出Bitget估计3.516亿至3.875亿美元范围、热/温钱包、未发现私钥泄漏和调查仍进行，不能写成最终调查结论。

## apply.mjs 只读复核

本分片没有运行或修改写入脚本。读取 `apply.mjs`、`editorial/review.ts`、`editorial/decision.ts`、`publication/publish.ts` 后，确认最终审核入口在事务中锁定article、report candidate、source和review，核对当前内容fingerprint与review fingerprint、version，并让决定、投影和审核日志一起提交。快照读取使用repeatable read；文案覆盖也核对原fingerprint与overrideVersion。`curated=false`会清除精选授权。并发审核在ready读取后若更改version，最终决定会抛出stale，而不会无条件覆盖。

需要在生产运行/恢复方案中处理以下问题：

1. **修正文案与最终决定分成两个提交。** `correct()` 在第26–49行独立提交override、投影与日志；第65–71行之后才准备并决定。后续失败或`changed_after_prepare`时，修正已落库、审核可能仍pending；错误回执不保留已提交的修正fingerprint。同一旧快照重跑会在第57行因fingerprint不同被跳过，无法自动恢复这条审核。门禁仍关闭，因此不是误发布，但存在部分写入及无法续跑的实际失败路径。应将单条修正和决定原子提交，或明确记录并验证原始到修正版本的恢复关系，不能简单用最新fingerprint补批。
2. **幂等成功判断范围不足。** 第54–55行只对actor/status/reason，不验证review fingerprint等于当前proposal，也不校验拟修正文案。相同actor和reason重复运行时可能将后来变化的内容判作already_applied。补验当前指纹与实际覆盖内容，并在变更时报告冲突。
3. **hold仅写备注且缺少写时锁。** 第60–63行的单独audit写入发生于inspect之后，并发另一位审核员可能已完成决定而回执仍显示held。此分片无hold，不影响当前429条，但不宜将held视作锁定待审状态的确认。
4. **文件直接运行的路径前提。** 第1–5行的相对import按模块文件路径解析。若直接运行保存在`.data/review-2026-10-02`下的文件，`./packages`并不存在；需使用项目根位置的模块，或已有从项目根执行stdin模块的方式。此为执行方式条件，未运行验证。

以上是静态只读结论，没有测试生产并发、没有执行数据库变更。生产是否完成，应以根审核最终回执、实际状态、公开投影和待审数量复核为准。

## 执行前修复补记

根任务已在执行前处理上述问题：修稿事务同时保存原始与修后指纹、覆盖版本及批次哈希，续跑仅允许匹配这份精确记录；幂等判断增加当前内容与审核指纹一致性检查。批次标识绑定固定文件哈希，修改批次后不能复用标识。没有 `hold` 项，该分支已移除；审核目标消失时按错误处理。正式执行采用生产项目根目录的标准输入模块方式。第二次只读复核未发现当前固定批次的误发布阻断点。

最终生产结果见[总审核说明](2026-10-02-editorial-review.md)，以实际状态与公开读取验收为准。
