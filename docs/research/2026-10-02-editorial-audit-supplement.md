# 2026-10-02 内容审核补充核对

本记录用于说明本批审核中另外打开并阅读的证据，不是全部条目的外部调查清单。批量审核的主要材料是生产数据库保存的原文、中文稿、版本和核验历史；本文件补充少量高风险疑点。

## Bitget 安全事件与 Halborn 文章

关联条目：`aobk03vdv4srd82pwgnc8hole`。

生产快照原文正文为空，只保留 Halborn 的短摘录，因此不能仅以摘要自身支持摘要。此次另行读取 [Halborn 2026-09-28 原文](https://www.halborn.com/blog/post/explained-the-bitget-hack-september-2026)。该文将金额写为估计约 3.875 亿美元，描述热及温钱包、后端交易伪造，以及第三方安全产品的漏洞；不能改写成所有钱包受影响或私钥被盗。

[Bitget 9 月 24 日初始公告](https://www.bitget.com/support/articles/12560603896024)当时估计涉及约 3.516 亿美元，并说明冷钱包未受影响。该公告与后来的损失估计须按时点区分。

从 [Bitget 9 月 30 日报告更新](https://www.bitget.com/support/articles/12560603896305)实际打开并读取其链接的 [Mandiant 状态报告](https://img.bgstatic.com/multiLang/events/MFR26-1029_Status_Update_Bitget_0930.pdf)，报告日期为 9 月 28 日，第 2 页将 Bitget 的损失估计列为 3.516 亿至 3.875 亿美元，并将第三方安全设备入侵和钱包服务器恶意包列为初步发现。报告说明调查仍在进行。因此 3.875 亿属于估计区间上端，不能审核为独立确认的最终损失。

## 采集原文中的金额与阶段对照

这些条目以本次生产原文快照作对照，未声称逐一外部复验：

- `z0ebxzqpdofrsuglzurw4riqu`：[a16z 预测市场数据文章](https://a16zcrypto.com/posts/article/prediction-market-record-week-data-charts)。原文的 14.4 billion、1.6 billion、3.6 billion 和 200 million 分别对应 144 亿、16 亿、36 亿和 2 亿美元；“上周”属于该文 2026-06-25 的时间语境。
- `zwsqotpfq4kd0ldphpweymhyi`：[Balancer 追回资金分配提案](https://forum.balancer.fi/t/bip-xxx-distribution-of-recovered-funds-from-balancer-v1-august-31st-2026-exploit/7111)。表中追回合计为 296.401711 ETH；约 139.37 万美元是攻击时被盗代币估值，不能全部当作已追回。提案通过后的执行步骤仍为条件句。
- `qcsshw3j77z8mryke4dd2ate5`：[SEC 起诉新闻稿](https://www.sec.gov/newsroom/press-releases/2026-95-sec-charges-multiple-entities-fraud-schemes-totaling-least-15-million-used-whatsapp-other-platforms)。原文两案金额分别超过 1,250 万及 280 万美元；“至少 1,500 万”是较保守的下限表述。应保持起诉、涉嫌和 SEC 指控的阶段。
- `eoz0yy4le1fgy5mfqqpb8sdlt`：[Polygon 支付通道测试文章](https://polygon.technology/blog/polygon-11-million-agent-payments-per-second)。1,100 万指 25 个 Hub 的链下支付更新处理量，不是主链交易 TPS。20 微秒是引擎确认时间并需另加网络延迟；0.15 美元对应测试配置下十亿次更新的成本。

## 队列诊断

本次 11:30:28（北京时间）一致性快照包含 1,287 条待审核内容，其中 1,073 条终止原因只有 `no_new_primary_evidence`。源码的证据补充阶段在没有补入新材料时用该通用原因覆盖当前原因；各轮 `decisions` 中仍保存更具体的缺一手证据、引文匹配失败、中文稿缺项等信息。

因此不能把这 1,073 条全部认定为误拦，也不能把该标记当成内容虚假的结论。本次审核同时读取中文稿、原文和较早轮次的具体原因，区分可修正、可按来源归因发布与证据不足三类情况。自动核验的分数及 supported 标签只用作线索。
