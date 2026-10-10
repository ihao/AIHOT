# 9BTC Web3 信源扩充与首次抓取验收

执行时间：2026-10-01 18:56:24—18:57:29（北京时间）。验收时间：2026-10-01T11:02:33.692Z（UTC）。

已在 https://9btc.com 对应的 EU 生产数据库新增 **88 个信源**，原有 6 个保留，合计 **94 个启用信源**。新增源首次抓取 **88/88 成功，0 失败，实际新增 254 条材料**；数据库材料从 237 条增加到 491 条。这里的抓取成功指已从真实上游读取并入库，不等于已经公开发布摘要。

## 接入范围

| 类别 | 新增 |
|---|---:|
| 官方项目动态 | 41 |
| 治理与研究论坛 | 14 |
| 独立研究与安全 | 13 |
| 监管与政策 | 10 |
| 专业作者 | 10 |

新增入口为 **59 个 RSS/Atom + 29 个网页栏目**；与原有 RSS 合并后是 **65 个 RSS/Atom + 29 个网页栏目**。10 个专业作者内容源包含 Vitalik、Jameson Lopp、Peter Todd、Matt Corallo、Dankrad Feist、Christine Kim、Haseeb Qureshi、Molly White、samczsun 和吴说团队刊物；机构栏目也收录多名研究者的署名文章，但没有把整家机构的内容标成某一个人发布。

所有新增源参与模式为 `editorial`，全文展示与全文再分发均关闭。官方项目、独立机构研究、开放治理论坛和个人作者分别配置可信级别与一手属性；开放论坛及二手安全/监管报道不当作官方已确认结论。新增源分别有 `source.create`、`source.update`、`source.auto_public` 审计，共 264 条；自动发布继续经过现有正文、逐项证据、中文文案及评分检查。

## 真实抓取与处理状态

- 新增材料 254 条，全部 `backfill=true`、`backfill_reason=first-import`；首次每源最多 3 条，samczsun 首次 1 条。部分低频来源只有 1—2 条符合回填范围。详情页补得的旧发布日期仍保留原值并按历史处理。
- 可读正文 242 条；正文未确认 12 条。非法 URL 0 条；未发现编号、Read More 或分类导航被当成文章标题。
- 253 条有原始发布日期；1 条 BNB 公告缺少可确认发布日期，保留空值与回填标记，没有将抓取时间冒充发布日期。
- 当前新增 254 条均处于待分析状态，处理错误为 `Budget for dashscope exhausted (day)`。生产预算为每分钟 10、每小时 60、滚动 24 小时 200 次，本次没有提高额度；当前滚动窗口已有 200 次模型回执。采集 worker 正常运行，后续任务继续受既定预算约束。
- 验收快照中没有新增公开摘要。94 个内部 publication 投影为 withdrawn/pending，不属于读者可见发布。
- 日期和正文确认的缺口与源列表读取状态分开计数：信源读取 88/88 成功，并不表示每个文章页面均可完整解析。

## 正文未确认的材料

| 信源 | 原文 |
|---|---|
| Vitalik Buterin | [Obfuscation (Part II): Diamond iO](https://vitalik.ca/general/2026/07/28/obfuscation_part_ii_diamond_io.html) |
| Halborn | [Morpho Vault Security: Risks, Vulnerability Classes, and Best Practices](https://www.halborn.com/blog/post/morpho-vault-security-risks-vulnerability-classes-and-best-practices) |
| Halborn | [Explained: The Nostra Finance Hack (September 2026)](https://www.halborn.com/blog/post/explained-the-nostra-finance-hack-september-2026) |
| 香港证监会 SFC | [SFC, Securities Commission Malaysia announce Single Submission Arrangement to streamline simultaneous listings in Malaysia and Hong Kong](https://apps.sfc.hk/edistributionWeb/gateway/EN/news-and-announcements/news/doc?refNo=26PR159) |
| Vitalik Buterin | [Obfuscation (Part III): Local Mixing](https://vitalik.ca/general/2026/08/21/obfuscation_part_iii_local_mixing.html) |
| Vitalik Buterin | [The cryptographic world computer](https://vitalik.ca/general/2026/09/27/the_cryptographic_world_computer.html) |
| Halborn | [Explained: The Bitget Hack (September 2026)](https://www.halborn.com/blog/post/explained-the-bitget-hack-september-2026) |
| 香港证监会 SFC | [SFC shares updates with securities industry on scam prevention and cybersecurity](https://apps.sfc.hk/edistributionWeb/gateway/EN/news-and-announcements/news/doc?refNo=26PR157) |
| 香港证监会 SFC 通函 | [Circular to Intermediaries Roadmap for Implementing the Hong Kong Investor Identification Regime for the Exchange-traded Derivatives Market](https://apps.sfc.hk/edistributionWeb/gateway/EN/circular/doc?refNo=26EC61) |
| 香港证监会 SFC 通函 | [Securities and Futures Commission & Securities Commission Malaysia Memorandum of Understanding on Simplified Dual IPO Listing Framework Circular on the Single Submission Arrangement for Dual Listings in Hong Kong](https://apps.sfc.hk/edistributionWeb/gateway/EN/circular/doc?refNo=26EC59) |
| 香港证监会 SFC | [SFC reprimands and fines Zheng Da International Financial Holding Limited $7 million and suspends its responsible officer for regulatory breaches](https://apps.sfc.hk/edistributionWeb/gateway/EN/news-and-announcements/news/doc?refNo=26PR158) |
| 香港证监会 SFC 通函 | [Circular to intermediaries Obtaining client consent under the Hong Kong Investor Identification Regime for the exchange-traded derivatives market (HKIDR-DM)](https://apps.sfc.hk/edistributionWeb/gateway/EN/circular/doc?refNo=26EC60) |

Vitalik 的 RSS 可读且无正文；其原站文章在生产网络无法形成可读正文。进一步试读本人官方 IPFS 镜像，HTTP 200、标题匹配，但现有 Readability 解析报 `Cannot read properties of null (reading tagName)`，因此仍保留未确认状态；镜像尝试在配置/正文写入之前结束，没有改变信源或伪造正文。Halborn 与 SFC 动态页面同样保留原文链接及正文未确认状态。

## 候选与暂缓项

研究登记表中的 230 条是不同用途的入口，包含静态规范、法律全文、储备披露、论文、人物身份页和条件观察账号。本次没有将这些全部伪装为持续新闻流。暂缓来源仍保留在研究登记表。
- X 的 SocialData 凭据未配置；未新增不可抓取的 X 账号，已通过独立博客/刊物接入可读取的作者。
- Chris Dixon、Nic Carter、Andreas、Mindao、Dovey、Mudit 等测试到的 RSS 已长期停更，不作为本轮活跃采集入口；人物的专业价值保留在研究库。
- Akash 测试 RSS 的文章链接指向 `/blog/undefined/`，未接入；Andre 的 updates.xml 是履历/站点更新，不作为新闻流；Solana Status 无近12个月事件，保留状态核查入口。
- ESMA 的日/月/年格式、MAS 动态新闻列表等尚未完成稳定规则验收；Circle/Tether 储备透明度、L2BEAT 数据页等继续作为核验和专题研究入口。
- Circle 官方网页当前仅直接暴露 3 个置顶链接，已按实际可读入口接入；它不保证覆盖该站所有动态栏目。Filecoin 中文流、DFINITY Medium 等属于低频入口。

## 生产与本地验收

- 变更前使用现有标准服务生成备份：`/var/backups/ninebtc/ninebtc-20261001T105620Z.dump` 及对应数据文件和校验清单；备份服务 Result=success、ExecMainStatus=0。
- 只在新增与首次抓取期间暂停 ninebtc worker，退出时自动恢复；worker 于 2026-10-01 10:57:30 UTC 恢复运行。
- 独立查询确认 94/94 信源启用且 health=ok；88 个新增源配置与批准清单一致，初始化游标存在，自动发布授权存在。
- https://9btc.com 的页面、API、RSS、站点发现文件和 MCP 共 30 项检查全部通过。
- 本地 94 条种子配置通过支持键、唯一 ID、回填上限、正则和全文许可检查；TypeScript 类型检查通过；Web 构建通过、前端测试 16/16 通过；采集器相关测试 20/20、RSS 条件请求及 XHTML 测试 5/5 通过。
- 按项目要求运行了独立空测试库的 41 个迁移与完整后端测试：256/286 通过，30 失败。失败包含安全阀 MODEL_CALLS_ENABLED=false 禁止模型调用，以及人工审阅场景断言；该运行发生在本地信源配置修改前，不能宣称全量测试通过。本次未改采集/发布引擎，也未重新部署应用镜像。
- 本地 industry/sources.json 已同步 94 源；生产以后台数据库配置为准，沿用现有固定代码版本 `6c9a96a4563cb59a859fbce45eb57488b7004d97`。

## 逐源入库回执

| 信源 | 类型 | 级别 | 新材料 | 可读正文 | 首次抓取 |
|---|---|---|---:|---:|---|
| a16z crypto | rss | T1_5 | 3 | 3 | 成功 |
| Aave Labs Blog | rss | T1 | 3 | 3 | 成功 |
| Aave 治理论坛 | rss | T2 | 3 | 3 | 成功 |
| Arbitrum Blog | rss | T1 | 3 | 3 | 成功 |
| Arbitrum 治理论坛 | rss | T2 | 3 | 3 | 成功 |
| Balancer Forum | rss | T2 | 3 | 3 | 成功 |
| BIS / BCBS / CPMI | rss | T1 | 3 | 3 | 成功 |
| Delving Bitcoin | rss | T2 | 3 | 3 | 成功 |
| Bitcoin Optech | rss | T1_5 | 3 | 3 | 成功 |
| BlockSec | web_list | T1_5 | 3 | 3 | 成功 |
| Blockstream Blog | rss | T1 | 3 | 3 | 成功 |
| BNB Chain Blog | web_list | T1 | 3 | 3 | 成功 |
| Celestia Blog | rss | T1 | 3 | 3 | 成功 |
| 美国 CFTC | web_list | T1 | 3 | 3 | 成功 |
| Chainlink Blog | web_list | T1 | 3 | 3 | 成功 |
| Circle Blog | web_list | T1 | 3 | 3 | 成功 |
| Compound Community Forum | rss | T2 | 3 | 3 | 成功 |
| Consensys | web_list | T1 | 3 | 3 | 成功 |
| EBA | web_list | T1 | 3 | 3 | 成功 |
| Eigen Labs / EigenLayer Blog | rss | T1 | 3 | 3 | 成功 |
| Electric Coin Company / Zcash | rss | T1 | 3 | 3 | 成功 |
| ENS Blog | web_list | T1 | 3 | 3 | 成功 |
| Ethereum Magicians EIP/ERC 讨论论坛 | rss | T2 | 3 | 3 | 成功 |
| Ethereum Research | rss | T2 | 3 | 3 | 成功 |
| 英国 FCA | rss | T1 | 3 | 3 | 成功 |
| Filecoin Blog | rss | T1 | 1 | 1 | 成功 |
| 美国 FinCEN | web_list | T1 | 3 | 3 | 成功 |
| Flashbots Collective | rss | T2 | 3 | 3 | 成功 |
| Flashbots Writings | rss | T1 | 3 | 3 | 成功 |
| Financial Stability Board | rss | T1 | 3 | 3 | 成功 |
| Galaxy Research | web_list | T1_5 | 3 | 3 | 成功 |
| Geth Releases | rss | T1 | 3 | 3 | 成功 |
| Glassnode Research | rss | T1_5 | 3 | 3 | 成功 |
| Halborn | rss | T1_5 | 3 | 0 | 成功 |
| 香港金管局 HKMA | rss | T1 | 3 | 3 | 成功 |
| DFINITY / Internet Computer Review | rss | T1 | 1 | 1 | 成功 |
| Immunefi | rss | T1_5 | 3 | 3 | 成功 |
| IPFS Blog & News | rss | T1 | 3 | 3 | 成功 |
| Matt Corallo / BlueMatt | rss | T1_5 | 2 | 2 | 成功 |
| Christine D. Kim | rss | T1_5 | 3 | 3 | 成功 |
| 吴说 / Colin Wu | rss | T2 | 3 | 3 | 成功 |
| Dankrad Feist | rss | T1_5 | 3 | 3 | 成功 |
| Haseeb Qureshi | rss | T1_5 | 3 | 3 | 成功 |
| Jameson Lopp | rss | T1_5 | 3 | 3 | 成功 |
| Molly White | rss | T1_5 | 3 | 3 | 成功 |
| Peter Todd | rss | T1_5 | 1 | 1 | 成功 |
| samczsun | web_list | T1_5 | 1 | 1 | 成功 |
| Vitalik Buterin | rss | T1_5 | 3 | 0 | 成功 |
| LayerZero Blog | web_list | T1 | 3 | 3 | 成功 |
| Lido Governance | rss | T2 | 3 | 3 | 成功 |
| Lightning Labs Blog | web_list | T1 | 3 | 3 | 成功 |
| MetaMask News | rss | T1 | 3 | 3 | 成功 |
| Monero Project | rss | T1 | 3 | 3 | 成功 |
| Morpho Blog | web_list | T1 | 3 | 3 | 成功 |
| Nansen | web_list | T1_5 | 3 | 3 | 成功 |
| 美国财政部 OFAC | web_list | T1 | 3 | 3 | 成功 |
| Ondo Finance Blog | web_list | T1 | 3 | 3 | 成功 |
| OpenZeppelin | rss | T1_5 | 3 | 3 | 成功 |
| Optimism Blog | web_list | T1 | 3 | 3 | 成功 |
| Optimism Collective 治理论坛 | rss | T2 | 3 | 3 | 成功 |
| OtterSec | rss | T1_5 | 3 | 3 | 成功 |
| Paradigm | web_list | T1_5 | 3 | 3 | 成功 |
| Paxos Blog | web_list | T1 | 3 | 3 | 成功 |
| Pendle 官方 Medium | rss | T1 | 2 | 2 | 成功 |
| Phantom | web_list | T1 | 3 | 3 | 成功 |
| Polkadot Forum | rss | T2 | 3 | 3 | 成功 |
| Polygon Blog | web_list | T1 | 3 | 3 | 成功 |
| Pyth Network Blog | web_list | T1 | 3 | 3 | 成功 |
| QuickNode Blog | rss | T1 | 3 | 3 | 成功 |
| Render Network 官方 Medium | rss | T1 | 3 | 3 | 成功 |
| Reth Releases | rss | T1 | 3 | 3 | 成功 |
| Rocket Pool Governance | rss | T2 | 3 | 3 | 成功 |
| Safe | web_list | T1 | 3 | 3 | 成功 |
| 香港证监会 SFC | rss | T1 | 3 | 0 | 成功 |
| 香港证监会 SFC 通函 | rss | T1 | 3 | 0 | 成功 |
| Sky 治理论坛 | rss | T2 | 3 | 3 | 成功 |
| SlowMist / 慢雾 | rss | T1_5 | 3 | 3 | 成功 |
| Solana 官方新闻 | rss | T1 | 3 | 3 | 成功 |
| Starknet Blog | web_list | T1 | 3 | 3 | 成功 |
| Stellar Development Foundation Blog | rss | T1 | 3 | 3 | 成功 |
| Sui Blog | rss | T1 | 3 | 3 | 成功 |
| Tether News | rss | T1 | 3 | 3 | 成功 |
| Trail of Bits | rss | T1_5 | 3 | 3 | 成功 |
| Uniswap Labs Blog | web_list | T1 | 3 | 3 | 成功 |
| Uniswap 治理论坛 | rss | T2 | 3 | 3 | 成功 |
| WalletConnect | web_list | T1 | 3 | 3 | 成功 |
| Wormhole Blog | web_list | T1 | 3 | 3 | 成功 |
| Zama | web_list | T1 | 3 | 3 | 成功 |

## 配置与证据

- [生产批准清单](2026-10-01-production-source-expansion-plan.json)
- [逐源执行回执](2026-10-01-production-source-expansion-receipt.json)
- [独立数据库验收](2026-10-01-production-source-expansion-verification.json)
- [同步后的种子配置](../../industry/sources.json)
- [香港证监会官方 RSS 说明](https://www.sfc.hk/en/RSS-Feeds)；[金管局官方新闻稿 API 文档](https://apidocs.hkma.gov.hk/documentation/press-releases/)。生产 SFC 使用其页面直接给出的新闻稿/通函 RSS，HKMA 使用已试读的官方 RSS；API 作为备选核验入口。
