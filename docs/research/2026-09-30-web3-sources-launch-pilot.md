# 9BTC 首批信源试运行建议

日期：2026-09-30。状态：**完成入口与样本验证，等待站长选择；尚未入库**。本报告接续[首轮摸底](2026-09-30-web3-sources-initial.md)。站点目前 0 个信源，采集和模型调用关闭。

## 初版建议

先接入以下 6 个免费公开 RSS，采用中文自写摘要和原文链接，站内全文与全文 RSS 均关闭。初次每源最多回填 3 条，合计最多 18 条；历史资料按原文时间归档，不包装成今日快讯。试运行期间全部人工审核，自动公开白名单保持关闭。已有发布门禁会让未审核内容保持私有。

| 来源与官方依据 | 使用入口 | EU 实际解析结果 | 初版用途与审核重点 | 初始频率 |
|---|---|---|---|---|
| [Bitcoin Core 官方 RSS 目录](https://bitcoincore.org/en/rss/) | `https://bitcoincore.org/en/releasesrss.xml`，`summaryIsBody=true` | 66 条，66 条有日期；最新 2026-07-13；前三条正文约 2,736–4,920 字符 | T1，一手版本说明。低频来源，不制造新鲜度；版本中的安全修复仍人工审核。普通公告 feed 只有短提示，改用版本说明 feed。 | 120 分钟 |
| [Ethereum Foundation Blog](https://blog.ethereum.org/) | `https://blog.ethereum.org/en/feed.xml` | 640 条，日期和 URL 完整且无源内重复；近 7 天 1 条；代表文章正文 8,995 字符 | T1，协议、研发与安全；排除纯活动招生。阶段区分测试网、主网计划和已激活。日期以来源字段和页面为准，不从 URL 路径推断。 | 120 分钟 |
| [Coin Metrics 官方文档指向的周刊](https://docs.coinmetrics.io/getting-started) | `https://coinmetrics.substack.com/feed` | 20 条，20 条有日期；近 7 天 1 条；前三条 feed 内含完整正文，约 9,400 字符/条 | T1，机构自有数据研究。把观察与观点分开，交代指标口径和时间窗；仅有价格表现或投资偏好的内容不进精选。 | 180 分钟 |
| [Chainalysis Blog](https://www.chainalysis.com/blog/) | `https://www.chainalysis.com/blog/feed/` | 10 条，日期和 URL 完整；滚动 7 天窗内 1 条；最新代表文章正文 22,297 字符 | T1，机构自有链上研究与安全分析。把估计金额、归因和样本范围归于来源；排除公司产品营销。 | 180 分钟 |
| [PANews 官方 RSS 配置页](https://www.panews.io/rss) | `https://www.panewslab.com/rss.xml?lang=zh&type=NORMAL` | 100 条，100 条有日期且 URL 无重复，均在近 7 天；feed 内含中文正文 | T2，中文背景解读与跨生态发现。只订文章，暂不订快讯；排除赞助营销、喊单与单纯价格波动。重大事实回到原始资料核对。 | 60 分钟 |
| [SEC 官方新闻稿](https://www.sec.gov/newsroom/press-releases) | `https://www.sec.gov/news/pressreleases.rss` | 25 条，25 条有日期；近 7 天 4 条；代表 Web3 公告正文 2,815 字符 | T1，监管原文。来源不限加密领域，先筛相关性；区分提案、征求意见、指控和生效规则，全部人工审核。 | 120 分钟 |

这里的 T1 表示来源发布自身协议公告、研究或监管材料，不表示其观点已经得到独立验证。PANews 以 T2 使用；其官网明确说明可能包含赞助、合作与市场评论，不能整源视为一手事实。[来源说明](https://www.panews.io/rss)

## 验证证据与局限

2026-09-30 北京时间 23:19–23:30，从实际 EU 应用容器调用本项目的 `fetchRss`，只读取公开 feed，没有写数据库，也没有模型调用。8/9 个初始候选成功解析；随后 Bitcoin Core 版本说明 feed 也验证成功。验证条目数量、日期、原文 URL、源内重复、近 7 天产出及第二次读取。Bitcoin Core 公告、Ethereum、Coin Metrics、Chainalysis、SEC 的第二次读取支持条件请求并返回未变化；PANews 和两个论坛重复返回完整列表，后续依赖站内判重。

可复核的条目数量、日期、原文 URL 和正文提取结果保存在[实测记录](web3-source-pilot-evidence.json)，不保存来源文章全文或服务器凭据。

再用 Agent Reach 的 feedparser 独立核对 Bitcoin Core 公告、Ethereum、Coin Metrics，均 HTTP 200 且无解析警告。对仅有摘要的来源，调用项目 `extractFromUrl`，关闭付费 Jina 回退，验证代表文章正文可读。RSS 中已经有正文的 Coin Metrics 和 PANews，无需为这些样本额外抓页面。

这些证据证明当前入口与代表样本可用，不等于长期稳定，也没有证明所有文章都可提取。PANews 至少 100 条/7 天，是主要审核量来源；首版先让模型排除噪声、人工审核优先队列，每晚优先处理约 10 条，积压继续待审。是否能稳定适配 30 分钟，需用真实试运行衡量，不提前承诺。免费 feed 不等于模型免费。

公开 RSS 表明来源提供订阅入口，不能据此推断获得全文、图片或报告图表的转载许可。本批候选只建议公开自写摘要、来源名称与原文链接，不复制付费报告、不绕付费墙。

## 后续候选

- **Aave 治理论坛**：30 条有日期，近 7 天 17 条，正文代表样本可读；其中混有普通提问。论坛帖子只能是讨论/提案证据，发帖不等于正式决策；首版先不加入，以减少审核量。
- **Uniswap 治理论坛**：30 条有日期，最新 2026-09-18，当前滚动 7 天无新增；可作后续治理观察源。
- **BlockBeats 文章 RSS**：官方[仓库](https://github.com/BlockBeatsOfficial/RSS-v2)公布 `https://api.theblockbeats.news/v2/rss/article`，但 EU 本次返回内容无法解析为 RSS/Atom。先排除，不能把官方文档存在当成接口可用。

## 试运行和上线顺序

1. 站长选择首批范围后，再将候选写入实际信源配置；首次限量回填，每条保持人工审核。候选 JSON 中 `enabled=false` 表示尚未批准启用。
2. 按[模型接入与验收方案](../model-9btc-pilot.md)配置真实模型接口和调用上限。当前 EU 的 API key、模型名和地址均未配置，`MODEL_CALLS_ENABLED=false`，不会产生模型费用。
3. 完成约 12–18 条真实样本的小规模闭环：抓取、初筛、分类、中文摘要、归组、人工批准和日报草稿。重点检查数字、主体、时间、链和事件阶段。初版不要求先完成 100–200 条标注或等待 7–14 天；这些作为上线后的持续校准，不把未验证的评分数字当成精确质量结论。
4. 有真实审核内容和通过验证的日报后，把 9btc.com 接入现有 EU Caddy，再验证网页、RSS、API、MCP、后台与 HTTPS。

前期所有内容人工审核，因此无需在首版同时放开自动发布。自动通道仍按已通过的设计保留，待普通版本说明样本验证后再逐源启用。隐私页等非主功能按站长要求本轮不调整。
