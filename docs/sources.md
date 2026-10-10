# 信源

信源在后台“信源”页管理：新建、预览、改频率、启停、查看失败原因和最近条目。2026-10-03 对生产当时启用的 81 个信源逐源检查后，暂停 16 个长期无近期有效新稿的入口，接入 10 个经生产 RSS、有效日期和正文实测的媒体来源（其中 BeInCrypto 依赖 RSS 完整正文，详情页返回 403）；随后新增 5 个预测市场媒体信源（CNBC、Front Office Sports、Sportico、iGaming Business、Casino.org），当前保留 109 个配置，80 个启用、29 个暂停。上限仅针对启用信源：最多 100 个，暂停配置及历史不计入。PANews 保持启用。逐源决策、候选排除理由与生产验收见[信源整顿报告](research/2026-10-03-source-renewal.md)。预测市场五源调研与生产验收见[接入报告](research/2026-10-03-prediction-market-sources.md)。此前扩充结果见[2026-10-01 报告](research/2026-10-01-production-source-expansion.md)。

初始化脚本导入 `industry/sources.json`，只添加缺失 ID，不覆盖后台已有配置或删除已有信源。种子配置不自动授予公开发布权限；生产新增源的授权另经审计设置。开发环境采集和模型安全阀保持关闭。

## 六种信源

| 类型 | 适合 | 需要 |
|---|---|---|
| `rss` | 有 RSS / Atom 的博客、媒体、Substack、公众号转 RSS 服务 | 无 |
| `web_list` | 没有 RSS 的网页列表（新闻页、博客列表、更新日志） | 写选择器；抓不到时可以经 Jina Reader 渲染（按次计费） |
| `json_list` | 返回 JSON 的接口（GitHub Releases 等） | 写字段路径 |
| `x_search` | X（推特）账号 | SocialData 的 key，按请求计费 |
| `mp_account` | 微信公众号 | 极致了（Dajiala）的 key，按请求计费 |
| `external` | 你自己的脚本推送进来的内容 | `INGEST_TOKEN`，见下文 |

每种信源认哪些配置项写在 `packages/backend/src/sources/config-keys.ts`。填了不认识的配置项，保存会被拒绝、抓取会直接失败并在后台显示原因，不会悄悄退回通用解析。

### rss

```json
{ "feedUrl": "https://example.com/feed.xml" }
```

可选：`summaryIsBody`（订阅里的摘要就是全文）、`allowCategories` / `denyCategories`（按订阅里的分类过滤）。

### web_list

```json
{
  "url": "https://example.com/news",
  "itemSelector": "article",
  "linkSelector": "a",
  "titleSelector": "h2",
  "publishedAtSelector": "time"
}
```

- `parseMode`：`html`（默认，用选择器）、`markdown`（经 Jina 渲染后按 Markdown 读）、`docusaurus_changelog`。
- `detail`：列表缺日期、标题或摘要时抓详情页补齐（`publishedAtSelector`、`titleSelector`、`summarySelector` 等）。
- `allowUrlPrefixes` / `denyUrlPrefixes`：只收某些路径下的文章。

### x_search

```json
{ "query": "from:SomeAccount -filter:replies" }
```

普通账号会被自动合并成一次搜索（每次最多二十几个账号），省请求数。

### mp_account

```json
{ "ghid": "gh_xxxxxxxx", "nickname": "公众号名称" }
```

每个公众号按它的抓取间隔检查一次（查列表按次计费），新文章的正文一并取回。

## 分级、参与方式与全文

- **分级** `tier`：`T1` 官方一手（官网、官方博客、机构）、`T1_5` 官方账号与准官方创作者、`T2` 媒体与个人、`EXCLUDE_MP` 不参与精选。入选门槛按分级不同（`industry/selection.ts`）。
- **参与方式** `participation_mode`：`editorial` 进精选和全部动态；`hot_signal` 不单独展示，只作为“大家在讨论什么”的热度证据；`isolated` 不进任何公开页面。
- **一手** `first_party`：来源是当事方自己。事件页会优先展示一手报道。
- **全文**：`site_fulltext` 决定站内能不能显示全文，`syndicate_fulltext` 决定全文 RSS 能不能带正文。两者**默认都关**，只显示摘要和原文链接；来源明确允许时再打开。公众号、付费墙内容不会因为技术上抓得到就获得全文展示。

## 抓取频率

每个信源有自己的抓取间隔。每天 04:20 会按近 7 天的产出自动调整：产出多的抓得勤，最短 15 分钟；免费信源最长 60 分钟，按次计费的信源最长 120–180 分钟。

抓取失败不推进位置，下次从同一处继续；连续失败的信源在后台标红，每周一会在运营群发一份信源周报（配置了飞书内部群时）。

## 规则：旧文不刷屏

自动模式依据原文发布时间，只入库和处理最近 48 小时、未来不超过 1 小时的有效日期稿件；过期、无日期和异常未来时间在入库前过滤，在任务执行时再次检查。已有档案保留，读者请求不会触发模型。新接入的信源必须显式设置 `_aihot.initialBackfillMonths: 1`，不得处理一个月以前的历史稿；本次十源还设置首次最多 3 条，保留更严格的 48 小时自动处理限制。首次导入标记继续防止历史资料进入今天或推送；媒体仅公开经过核验的摘要和原文链接。

## 外部推送接口

自己写脚本抓的内容，可以推进站里，走和普通采集一样的判重、精选和归组。

```
POST /api/ingest/items
Authorization: Bearer <INGEST_TOKEN>
Content-Type: application/json

{
  "sourceId": "my-crawler",
  "sourceName": "我的抓取脚本",
  "items": [
    { "title": "必填", "url": "必填", "publishedAt": "2026-10-01T08:00:00+08:00", "author": "可选" }
  ]
}
```

- `INGEST_TOKEN` 在 `.env` 里设置，至少 16 位；不设置时接口一律返回 401。
- 每次最多 50 条；每个客户端每分钟最多 10 次。
- 返回 `{"ok": true, "created": <新建条数>}`。缺标题或网址的条目会被跳过，同一请求里重复的网址只取第一条。
- `sourceId` 不存在时会自动建一个 `external` 信源，默认不进公开页面：到后台把它的参与方式改成 `editorial` 才会出现在站上。
- 条目的 `raw._aihot.backfill` 为 `true` 时按历史回灌处理（不进入“今天”、不推送）。

## 预测市场媒体

CNBC 使用综合 RSS，但仅保留标题或摘要含 Polymarket、Kalshi、prediction market / prediction-market、event contract、Novig 的条目；配置中 `dropMarkers: [""]` 使用空字符串，表示先默认过滤所有稿，再由 `keepIfMatches` 保留主题匹配稿。其余四家使用官方预测市场标签 RSS，过滤优惠码、拉新奖金及下注推荐标题。媒体均为 T2，按现有评分与核验规则处理，仅展示摘要与原文链接。接入时 Front Office Sports 与 Sportico 的最近稿件已超过自动 48 小时窗口，首次采集成功但未导入旧文，等待后续新稿。
