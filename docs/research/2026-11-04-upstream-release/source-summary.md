# 公开 RSS before / after 解析验证

实际下载 5 个已配置公开 RSS，4 个完整成功；旧版和新版各解析 **775 条**，候选条数一致，解析错误 0。

| 来源 | 完整下载 | 旧 / 新 | 变化条数 | 内容变化（不含新增日期精度） |
|---|---:|---:|---:|---|
| bitcoin-core-releases | 否（curl 18，部分传输） | 排除 | — | — |
| ethereum-foundation | 是 | 645 / 645 | 645 | 无 |
| coin-metrics | 是 | 20 / 20 | 20 | excerpt: 5, bodyHtml: 20 |
| chainalysis | 是 | 10 / 10 | 10 | excerpt: 10 |
| panews-articles-zh | 是 | 100 / 100 | 100 | bodyText: 2 |

775 条均新增 `publicationTime`，且逐条核对原 XML 的显式时区 `pubDate`，结果与既有 `publishedAt` 相同。**32 条**还存在内容变化，**743 条**仅增加日期精度元数据。URL、title、publishedAt、sourceUpdatedAt、bodyStatus 均无变化。

- Coin Metrics 20 条恢复原订阅里的 **155 个**带链接图片；删除新增的这些图片节点后，正文 HTML 与旧版逐字节一致，所有输出图片 URL 均存在于对应原始条目。
- Coin Metrics 5 条和 Chainalysis 10 条摘要将 `&#8217;` / `&#8209;` / `&#8230;` 等转换为原字符。逐条检查仅为实体解码及空白折叠。
- PANews 第 56、72 条正文将字面 `&#xA;` 解码为空白；逐条核对无其他文案改变。
- 人工抽查了 Ethereum 日期、Coin Metrics 第 0 / 7 / 15 条、Chainalysis 第 0 / 7 条、PANews 第 56 / 72 条；上述变化符合原 XML。完整自动不变量与人工样例见 `correctness-review.json`。

运行边界：

- 原始 XML 保存在同目录；`download-manifest.json` 包含原 URL、最终 URL、下载时间、字节数与 SHA-256。Bitcoin Core 部分响应保留但不参与解析。
- 在 `env -i` 干净环境中加载 `scripts/test-local-only.ts`，外网拒绝探针通过；8 次请求均访问同一个 `127.0.0.1` 回放端口。采集、模型、飞书、IndexNow 阀关闭，未提供模型密钥。数据库 URL 指向不可达的本地 1 端口，记录中没有数据库连接。
- 旧、新解析模块的实际文件 SHA-256 已记录；新目录为尚未提交的合并结果，不能仅用 HEAD 区分。
- 这里验证真实订阅字节的 RSS 解析保真度；未验证文章事实、详情页提取、真实模型、数据库入库、生产采集或发布。

重放脚本：`replay.mjs`；所有 before / after / changes 文件按来源 ID 命名。
