# 2026-10-03 新信源候选评估

评估时间：北京时间 2026-10-03 02:19—02:25。操作前 `industry/sources.json` 为 94 个配置，本次候选均未与现有配置重复。最多增加 6 个配置，总配置不超过 100 个；不为凑满数量接入无法读取正文、没有近期更新或限制不适合的来源。

用户明确要求新接入不处理一个月以前的数据。新增配置必须显式设置 `_aihot.initialBackfillMonths: 1`、`initialBackfillLimit: 3`；保留现有自动采集与处理的 48 小时新鲜度过滤。一个月是回填上限，48 小时仍是当前实际自动处理窗口。未知日期不能以抓取时间代替原始发布时间。

## 方法与证据边界

通过 Agent Reach 的 Exa 搜索定位发布方入口，使用官方 RSS、官方 GitHub 文档和文章页核验。首次沙箱网络失败，授权联网后成功。RSS 使用公开 HTTP 加 XML 解析探测，不调用模型、不登录、不绕过访问限制；临时探测结果保存在 `/tmp/9btc-source-candidates-probe.json`、`/tmp/9btc-source-candidates-extra.json` 和 `/tmp/9btc-source-candidates-categories.json`。

主任务随后在生产运行环境复核原生 RSS 解析与正文提取；正文证据保存在 `.data/new-source-body-probe-2026-10-03.json`，日期证据保存在 `.data/new-source-date-probe-2026-10-03.json`，日期探测时间 `2026-10-02T18:23:27Z`。CryptoSlate 本机成功、生产 403，因此退出推荐名单，由生产已通过的 Bitcoin Magazine 替代。页面总文本长度含导航，不能等同正文长度；RSS 正文字段的长度单独统计。此次短期快照证明入口和样本可用，不证明长期可用率、模型核验通过率或已公开发布。

## 通过生产入口实测的六个来源

均按 `rss`、`tier: T2`、`participation_mode: editorial`、`first_party: false` 接入，沿用现有核验和选编门槛。`site_fulltext` 与 `syndicate_fulltext` 均保持 `false`，对外只发布独立摘要、来源归属和原文链接。RSS 提供全文不等同于授权商业全文转载。

| 优先级 | 来源与官方入口 | RSS 条数 / 近 48 小时条数 | 正文与日期样本 | 主要补充价值与限制 |
| --- | --- | --- | --- | --- |
| 1 | [CoinDesk RSS](https://www.coindesk.com/arc/outboundfeeds/rss/)；[官方 RSS 说明](https://www.coindesk.com/coindesk-news/2021/09/17/coindesk-rss) | 25 / 24 | RSS 仅 120—183 字符摘要；本机与生产详情页 HTTP 200，页面声明日期与 RSS 一致；生产正文提取通过 | 综合新闻、独家报道、监管与技术；须公开正文提取，含观点和行情直播 |
| 2 | [Cointelegraph RSS](https://cointelegraph.com/rss) | 30 / 30 | RSS 仅 140—173 字符摘要；本机与生产详情页 HTTP 200，含文章正文结构和一致的声明日期；生产正文提取通过 | 监管、协议动态、稳定币和代币化新闻；夹杂杂志文章、日综述和行情 |
| 3 | [Decrypt RSS](https://decrypt.co/feed) | 39 / 29 | RSS 仅 123—154 字符摘要；本机与生产详情页 HTTP 200，标题一致；生产正文提取通过 | 企业、法律和技术新闻；泛 AI、游戏及宏观市场内容比例明显，必须降噪 |
| 4 | [Bitcoin Magazine RSS](https://bitcoinmagazine.com/feed)；[官方归属说明](https://bitcoinmagazine.com/about) | 10 / 10（生产） | 生产原生 RSS 解析、3 篇 RSS 完整正文通过，3 篇详情日期与 RSS 一致、HTTP 200 | Bitcoin、企业托管、矿业和基础设施补充；有新闻稿、视频、行情和赞助内容，需过滤。发布方为 BTC Media LLC / BTC Inc，属于媒体，不当作报道涉及公司的第一手声明 |
| 5 | [Odaily 文章 RSS](https://rss.odaily.news/rss/post)；[发布方官方 RSS 文档](https://github.com/ODAILY/RSS) | 10 / 4 | `description` 实际为完整文章；4 条近期文章长 2,221—18,179 字符；本机与生产详情页 200，RSS 与页面日期一致 | 中文长文和报告解读；部分文章为转载或翻译，原始作者应参与独立性判断，不能把转载自动计为独立原始证据 |
| 6 | [BlockTempo RSS](https://www.blocktempo.com/feed/) | 10 / 10 | RSS `content:encoded` 抽样约 1,810—1,974 字符；本机与生产详情页 200，生产正文提取通过 | 繁体中文及台湾金融语境；泛 AI、游戏、宏观和网络犯罪混入，正文证据链接密度较低。页面存在多个互相矛盾的声明日期，采用官方 RSS 明确 UTC 时间 |

### 日期与原始材料核对

- CoinDesk 的 [BNY / Payward 报道](https://www.coindesk.com/business/2026/09/30/bny-in-talks-with-kraken-parent-payward-over-infrastructure-partnership)：URL 路径含 9 月 30 日，RSS 和页面 `datePublished` 却一致为 `2026-10-02T17:34:40Z`，本机与生产均未发现该样本的 `dateModified` 字段。另一个样本确有独立的较晚 `dateModified`。不能仅凭 URL 日期判断新鲜度，当前未发现 feed 把该样本更新时间替代原始日期的证据；保存发布方原始日期。
- Cointelegraph 的 [Lloyds 代币化调查报道](https://cointelegraph.com/news/71-percent-uk-finance-leaders-expect-tokenization-reshape-financial-services-lloyds)：RSS `2026-10-02T16:20:24Z`，页面 `datePublished` 同秒，详情公开可读。
- Decrypt 的 [Blast 报道](https://decrypt.co/379972/ethereum-layer-2-blast-shutting-down)：RSS `2026-10-02T17:47:06Z`，页面声明 `2026-10-02T17:47:06`。以 RSS 明确时区日期为基准，不臆造页面缺失的时区。
- Bitcoin Magazine 的 [Absa 托管报道](https://bitcoinmagazine.com/news/absa-first-african-bank-to-custody-bitcoin)：生产 RSS `2026-10-02T18:12:28Z`，页面 `datePublished` 为等价的 `2026-10-02T13:12:28-05:00`，`dateModified` 为稍晚的 `13:13:35-05:00`。日期区别真实存在；采集保留原始发布时间。
- Odaily 的 [Pantera 代币化报告](https://www.odaily.news/zh-CN/post/5213242)：RSS 与页面均为 `2026-10-02T10:00:00Z`，RSS 正文 18,179 字符，保留 Pantera 报告外链。其 [NEAR Intents 报道](https://www.odaily.news/zh-CN/post/5213243) 为 `2026-10-02T07:00:00Z`，2,221 字符，原文链接为 TechFlow；后者是媒体转载链，不是协议官方确认。
- BlockTempo 的 [Blast 报道](https://www.blocktempo.com/blast-l2-network-shutdown-withdraw-before-october/)：RSS 为 `2026-10-02T15:41:01Z`；生产页面同时声明 `2026-10-02T15:41:01+08:00` 和 `2026-10-02T23:41:01+08:00`，后者与 RSS 等价。页面多个声明矛盾，采用官方 RSS 日期，不启用从前一个页面字段强制覆盖发布时间的规则。

生产正文提取器对 CoinDesk 三篇样本读出 3,552—5,863 字符，并保留 Payward、Nasdaq、BNY、SEC、Blast 官方账号等外链；Cointelegraph 三篇读出 2,913—4,735 字符，包含 Lloyds 官方报告、CME、QCP 等链接；Decrypt 三篇读出 2,896—4,506 字符，包含 Blast 官方账号、SEC、NVIDIA 投资者公告和 BLS 等链接。Decrypt 也插入 Myriad 预测市场链接，应与原始证据区分。Cointelegraph 的 Lloyds 报告 PDF 路径含 `07.01.2026`，不能因为媒体稿件日期新就直接认定其底层报告也新；继续用现有新证据核验处理可能的旧材料重炒。

## 可直接使用的采集配置

以下为候选基础配置，需经过生产原生采集器验证后再落库；最终上线状态和实际过滤项以主任务的操作记录为准。

```json
[
  {
    "id": "bitcoin-magazine-news",
    "kind": "rss",
    "config": {
      "feedUrl": "https://bitcoinmagazine.com/feed",
      "fetchPublicContent": true,
      "sortByPublishedAt": true,
      "_aihot": {"initialBackfillLimit": 3, "initialBackfillMonths": 1}
    }
  },
  {
    "id": "coindesk-news",
    "kind": "rss",
    "config": {
      "feedUrl": "https://www.coindesk.com/arc/outboundfeeds/rss/",
      "fetchPublicContent": true,
      "sortByPublishedAt": true,
      "_aihot": {"initialBackfillLimit": 3, "initialBackfillMonths": 1}
    }
  },
  {
    "id": "cointelegraph-news",
    "kind": "rss",
    "config": {
      "feedUrl": "https://cointelegraph.com/rss",
      "fetchPublicContent": true,
      "sortByPublishedAt": true,
      "_aihot": {"initialBackfillLimit": 3, "initialBackfillMonths": 1}
    }
  },
  {
    "id": "decrypt-news",
    "kind": "rss",
    "config": {
      "feedUrl": "https://decrypt.co/feed",
      "fetchPublicContent": true,
      "sortByPublishedAt": true,
      "_aihot": {"initialBackfillLimit": 3, "initialBackfillMonths": 1}
    }
  },
  {
    "id": "odaily-articles-zh",
    "kind": "rss",
    "config": {
      "feedUrl": "https://rss.odaily.news/rss/post",
      "summaryIsBody": true,
      "fetchPublicContent": true,
      "sortByPublishedAt": true,
      "_aihot": {"initialBackfillLimit": 3, "initialBackfillMonths": 1}
    }
  },
  {
    "id": "blocktempo-news-zh",
    "kind": "rss",
    "config": {
      "feedUrl": "https://www.blocktempo.com/feed/",
      "fetchPublicContent": true,
      "sortByPublishedAt": true,
      "_aihot": {"initialBackfillLimit": 3, "initialBackfillMonths": 1}
    }
  }
]
```

`summaryIsBody: true` 只用于已证明 `description` 为全文的 Odaily 文章入口。不能把 CoinDesk、Cointelegraph、Decrypt 的短摘要标记为完整正文。Bitcoin Magazine 和 BlockTempo 的 RSS 自带 `content:encoded`，原生 RSS 解析器会按正常路径接收，不需要假装摘要是正文。

## 实际分类与降噪建议

分类过滤精确匹配、区分大小写。以下分类名称来自本次实际 RSS；它们是建议，不能声称尚未落库的规则已经生效。

| 来源 | 已观察分类与数量 | 建议 |
| --- | --- | --- |
| CoinDesk | `News` 21，`Markets` 7，`Tech` 7；`Opinion` 2，`Live News` / `live_news` 各 2，`Crypto Markets Today` 2 | 优先过滤观点和实时行情直播。`Markets` 包含 ETF、资金与重大经济触发，不能整类判为无效 |
| Cointelegraph | `Latest News` 23，`Markets` 5，`Magazine` 2 | 优先新闻；杂志可单独降噪。`Markets` 包含 BNB 链代币化证券规模，不应全部排除 |
| Decrypt | `Law and Order` 10，`Markets` 8，`Artificial Intelligence` 8，`Business` 3，`Opinion` 3，`Coins` 3，`Technology` 2，`Gaming` 1，`Our Company` 1 | 可过滤 `Opinion`、`Gaming`、`Our Company`；泛 AI 需要主题过滤或暂时过滤该分类，注意可能同时排除与链上支付有关的 AI 稿件 |
| Bitcoin Magazine | `NEWS`、`MARKETS`、`BITCOIN FOR CORPORATIONS`、`VIDEOS` / `Video`、`PRESS RELEASES` / `Press Release`，另有主题标签 | 过滤视频、新闻稿及赞助 / 活动 / 纸媒推广；分类精确匹配应同时覆盖大小写。保留基础设施、托管与监管新闻，纯价格预测按标题降噪 |
| Odaily | 10 条均为 `Odaily` | 分类无法降噪；标题过滤泛 AI 人物恩怨、交互任务合集、与 Web3 无关的半导体财报等；保留代币化、协议安全、监管报告 |
| BlockTempo | `加密貨幣市場` 2，`市場分析` 2，`穩定幣` 1，`AI` 2，`遊戲` 1，另有泛网络犯罪与宏观 | 可过滤 `遊戲`；泛 AI 和非加密网络犯罪采用主题筛选。不得因为出现“空投”标签就误删带该标签的 Blast 网络关闭稿 |

研究过的候选中 CryptoSlate 原始链接密度较好，但生产访问失败优先于本机质量结论，所以没有占用接入名额。Odaily 三篇样本分别指向报告发布页、另一家加密媒体和泛财经媒体；其独立性需要沿转载链判断。BlockTempo 抽样 RSS 正文未带 `<a href>` 外链，仅靠文本叙述，不能以读得到文字替代证据核验。Bitcoin Magazine [官方主站](https://bitcoinmagazine.com/) 单列赞助内容和活动，仍需显式过滤，官方身份不会让付费新闻稿自动成为独立报道。

## 未建议本次接入的候选

| 候选 | 当前实际证据 | 结论 |
| --- | --- | --- |
| [Blockworks](https://blockworks.co/feed) | 重定向 `blockworks.com/feed`；50 条，最新停在 `2026-01-07`，近 48 小时 0 条 | 不接入；全部已超过用户一个月历史上限。HTTP 200 不是有效新鲜信源 |
| [The Defiant](https://thedefiant.io/feed) | 重定向 `thedefiant.io/api/feed`，100 条 / 36 条近期；抽样两篇页面均声明 `isAccessibleForFree:false`，RSS 正文仅 154—182 字符 | 当前样本不满足公开完整正文要求，不绕过付费限制；备用 newsletter 域名重定向同一 feed，不能算两个来源 |
| [The Block](https://www.theblock.co/rss.xml) | RSS 200，19 条全为近期；抽样两篇详情均 403 | 暂不接入；摘要可读不足以证明正文可用 |
| [DL News RSS 入口说明](https://www.dlnews.com/rss/) | 返回的是 HTML 入口页；发布方明确限制 RSS 商业用途，须事先书面许可 | 本次不接入；不将公开 RSS 当作无限商业转载许可 |
| [CryptoSlate](https://cryptoslate.com/feed/) | 本机 200、10 条近期且正文较完整；生产原生抓取 403 | 本次不接入；本机可读不能作为生产入口可行性的替代证据 |
| [BlockBeats 官方 RSS v2 文档](https://github.com/BlockBeatsOfficial/RSS-v2) | 旧版 `/v1/open-api/home-xml` 与新版 `/v2/rss/all`、`/v2/rss/article`、`/v2/rss/newsflash` 都是 HTTP 200、105 字节、0 条 | 本次不接入；官方文档证明入口存在，未证明当前有有效输出 |
| [Odaily 快讯](https://rss.odaily.news/rss/newsflash) 与 [官方 REST](https://github.com/ODAILY/REST-API) | 快讯 RSS 10 条近期，但大量 58—219 字符短稿与价格快讯；`isImportant=true` REST 请求抽样仍包含价格波动 | 选择文章 RSS 作为一个配置，不同时扩张多个快讯配置；重要过滤效果尚未证明 |

## 接入验收要求

1. 在生产原生采集器验证 HTTP、解析、有效原始日期、正文提取和降噪后的候选；无需模型调用即可完成入口可行性验收。
2. 确认新增配置显式一个月上限、首批最多 3 条、自动处理仍过滤超过 48 小时及无日期内容；保留 `fetch_runs` 的过滤统计。
3. 新源自动发布权限只能通过已有管理流程和审计开启，后续摘要和核验继续走已有门槛及预算；不重置预算、不降低质量标准。
4. 验收总配置数不超过 100，保留暂停源配置及历史；本文件不宣称已经接入或产生公开文章，实际结果见主任务生产操作与验收报告。

## 第二批补充调研与数量约束更正（02:31—02:34）

用户后续澄清：**100 个上限只计算启用来源，暂停来源不计入。** 本节覆盖前文按总配置数量理解的限制；保留旧配置和历史不占用活跃名额。第一批完成后的主任务快照为总配置 100、启用 71、暂停 29，仍有活跃余量，但只增加能够提供有效材料的来源。

本轮再次对照更新后的 100 个来源，未重复第一批六源或此前排除项。继续显式设置一个月回溯、首次最多 3 条，当前自动模式仍只处理近 48 小时；对外全文权限保持关闭。

### 优先推荐的四个补充来源

| 来源 | 发布方入口与本机公开探测 | 有效范围与噪声 | 接入建议 |
| --- | --- | --- | --- |
| ChainCatcher 中文文章 | [官方 RSS 文档](https://github.com/ChainCatcherOfficial/RSS)；[官方 RSS](https://www.chaincatcher.com/rss/clist)：HTTP 200、674 条、442 条近 48 小时；`content:encoded` 带全文，抽样详情 200、日期与 RSS 一致 | 实际分类 `快讯` 645 条、`文章` 29 条，其中文章 19 条近 48 小时；混合泛 AI、宏观、美股和活动推广。文章原始外链包括 BCG、a16z、研究报告发布页，部分是其他媒体转载 | `allowCategories: ["文章"]` 避免快讯洪流；全文按 RSS 正常读取。另按标题过滤无 Web3 内容的宏观 / 股票 / AI 及活动宣传，不把转载当作独立原始证据 |
| TechFlow 中文 Web3 文章 | [发布方官方 RSS 生成页](https://www.techflowpost.com/rss)明确提供无需登录的定制入口；[已实测 Web3 文章 feed](https://www.techflowpost.com/rss/v2/feed.xml?lang=zh-CN&type=article&topic=web3&tag=all)：HTTP 200、50 条、14 条近 48 小时；两篇详情 200、日期一致 | `description` 是完整文章，近期抽样 788—9,206 字符；全部分类都是 `TechFlow`，无法再用分类区分广告。包含协议安全、稳定币、zkAPI、招聘报告，亦有 WasabiCard 活动与赞助宣传 | 明确使用 `type=article&topic=web3`，`summaryIsBody: true`；保留原始日期。过滤活动、Side Event、Gold Sponsor 等宣传稿；有明确来源的报告和协议进展再进入证据审核 |
| Protos 英文调查与安全报道 | [发布方关于页](https://protos.com/about/)自述编辑独立、赞助内容另行标识；[官方 RSS](https://protos.com/feed/)：HTTP 200、10 条、9 条近 48 小时；完整 `content:encoded`，两篇详情 200、日期一致 | 10 条中 8 条含 `Crypto` 分类，另外有 Nike 股票和债券 ETF；有 `AI`、`CHART` 类别。加密样本直接链接 SEC 文书、法院材料、Etherscan、Lido 治理、MetaMask、GitHub | `allowCategories: ["Crypto"]`，可再排除 `AI` / `CHART`。保留安全、法院判决、协议退出和公司原始披露的报道；`first_party: false`，媒体正文里的外链再逐项核验 |
| BeInCrypto 协议与监管报道 | [发布方 RSS](https://beincrypto.com/feed/)：生产原生解析 HTTP 200、12 条均近期、完整正文及原始外链可读；本机两篇详情为 403 | 抽样正文 2,750 / 3,916 字符，包含 Blast 官方账号、L2Beat、Tether 官网与 RGB 相关入口；同时混股票、泛 AI、价格分析、商品市场 | 通过公开 RSS 原生正文读取，不依赖受限详情页，也不绕过限制；按分类过滤股票、AI、交易预测与商品。全文仅内部核验，对外独立摘要、归属和原文链接 |

本机临时证据：`/tmp/9btc-source-candidates-round2.json`、`/tmp/9btc-source-candidates-round2-detail.json`。生产第二轮证据为 `.data/second-source-probe-2026-10-03.json` 和 `.data/second-source-filtered-probe-2026-10-03.json`：四个推荐来源的 RSS 与正文原生读取均成功，Coinbase 403；TechFlow 已改为上述 Web3 文章入口。生产已接入状态与实际材料入库仍由主任务验收。

北京时间 02:34 的生产过滤快照：

| 来源 | 过滤前近期条数 | 过滤后近期条数 | 验证结果 |
| --- | --- | --- | --- |
| ChainCatcher | 442 | 18 | 文章类别过滤有效，抽样完整正文 1,718—5,637 字符，详情 200、日期一致；仍需过滤泛财经与活动宣传 |
| TechFlow Web3 文章 | 14 | 14 | Web3 / 文章入口有效，完整正文 788—1,634 字符，详情 200、日期一致；本次额外噪声规则未移除首条 WasabiCard 活动宣传，不能声称活动降噪已全部生效 |
| Protos | 8 | 5 | 剔除股票、泛 AI 和图表内容后，保留安全、公司披露等完整正文；详情 200、日期一致。相比早期本机 9 条近期，有一条在运行间跨过 48 小时边界 |
| BeInCrypto | 12 | 7 | 股票 / 泛 AI / 交易预测分类过滤有效；三篇 RSS 正文 2,750 / 3,916 / 3,118 字符为 `ok`，原始外链保留；详情仍是 403，采集使用完整 RSS 正文 |

这组数值是当次过滤快照，不是日均产量或已公开条数。后续若增加活动宣传过滤，数量应以最后一次生产验收为准。

### 第二批配置草案

```json
[
  {
    "id": "chaincatcher-articles-zh",
    "kind": "rss",
    "config": {
      "feedUrl": "https://www.chaincatcher.com/rss/clist",
      "allowCategories": ["文章"],
      "fetchPublicContent": true,
      "sortByPublishedAt": true,
      "_aihot": {"initialBackfillLimit": 3, "initialBackfillMonths": 1}
    }
  },
  {
    "id": "techflow-articles-zh",
    "kind": "rss",
    "config": {
      "feedUrl": "https://www.techflowpost.com/rss/v2/feed.xml?lang=zh-CN&type=article&topic=web3&tag=all",
      "summaryIsBody": true,
      "fetchPublicContent": true,
      "sortByPublishedAt": true,
      "_aihot": {"initialBackfillLimit": 3, "initialBackfillMonths": 1}
    }
  },
  {
    "id": "protos-news",
    "kind": "rss",
    "config": {
      "feedUrl": "https://protos.com/feed/",
      "allowCategories": ["Crypto"],
      "denyCategories": ["AI", "CHART"],
      "fetchPublicContent": true,
      "sortByPublishedAt": true,
      "_aihot": {"initialBackfillLimit": 3, "initialBackfillMonths": 1}
    }
  },
  {
    "id": "beincrypto-news",
    "kind": "rss",
    "config": {
      "feedUrl": "https://beincrypto.com/feed/",
      "denyCategories": ["Stocks", "Stock Market News", "AI Companies", "AI Technology Trends", "Trading", "Altcoin Analysis", "Commodities"],
      "fetchPublicContent": true,
      "sortByPublishedAt": true,
      "_aihot": {"initialBackfillLimit": 3, "initialBackfillMonths": 1}
    }
  }
]
```

过滤推广与过滤无关主题应明确区分：含“稳定币”不意味着活动软文就值得保留。统一 `keepIfMatches` 豁免如果放入稳定币等宽泛词，会让带这些词的广告绕过过滤，应在实际配置中检查例外效果。

### 其他本轮候选与取舍

- [Kraken 官方 blog feed](https://blog.kraken.com/feed/)：10 条有 6 条 `Asset Listings`，扣除后 4 条，仅 1 条在 48 小时内，且是 `Promotions` 抽奖。继续排除促销后没有近期有效材料。虽然官方身份与正文都可确认，当前新增它不能改善有效产出，不为增加数量而接入。
- BeInCrypto 已由本机待定候选升级为生产 RSS 通过候选，见上表。其详情页受限仍如实保留记录，不能把完整 feed 的可读性推断为详情页也可读。
- [CryptoBriefing feed](https://cryptobriefing.com/feed/)：HTTP 200、30 条均近期，RSS 只有 239—281 字符摘要，详情 200；分类包含 `Finance` 8、`Technology` 10、`AI` 5、`Prediction Markets` 3、`Politics` 1、`Regulation` 1、`Macro` 2，泛 AI 与美国选举预测稿占比明显。若接入必须过滤预测政治和 AI，并使用正文提取；优先级低于前三，不以短摘要充作全文。
- [Coinbase blog RSS 路径](https://www.coinbase.com/blog/rss.xml)：本机 403，未证明可用。保留为后续入口研究，不当前接入。
- [Foresight 主站](https://foresightnews.pro/)：`/rss` 重定向主站 HTML，未找到官方可直接解析的 RSS。第三方 RSSHub 路由不能冒充发布方官方接口；本次不接入。
- Rekt、Elliptic、TRM、Alchemy 的试探 RSS 路径分别 500 / 404 / 404 / 404。没有证明有效官方入口，不推荐用猜测配置上线。
- Binance 搜索到的 RSS 介绍来自 Square 用户帖子，不是官方 RSS 接口承诺，也没有独立核验可用地址；不把社区帖子当作官方授权或可部署配置。

本次增加质量优先，不建议填满剩余名额。新媒体全文用于内部事实核验，对外继续独立摘要与原文链接；当前并未取得或宣称商业全文转载授权。


## 最终生产接入回执补充

主任务在北京时间 02:36 已完成第二批四源创建、自动发布审计授权和首次抓取。最终取消 TechFlow/ChainCatcher 的通用主题豁免，明确活动推广标题过滤；创建前生产重抓的近 48 小时有效候选分别为 ChainCatcher 15、TechFlow 11、Protos 5、BeInCrypto 7。四源首次各入库 3 条；最终共 75 个启用源、29 个暂停配置、总保留 104 个，100 上限只计算启用源。生产结果与公开边界见[整顿验收报告](2026-10-03-source-renewal.md)及其生产凭证。
