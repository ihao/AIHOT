# 9BTC 2026-11-04 上游整合与发布验收

用户已完成 fork 的 main 同步，本轮按授权将 cd424b0 增量整合到 9BTC 业务历史，保留正常双父 merge。应用提交 `7a03ab1abcaefe0defb13b992734a4d56f0a35e0` 已推送业务分支并部署生产。后续文档提交只记录验收，不改变运行应用源码。

## 保留与适配

保留9BTC品牌、Web3七类key/提示词/主题/来源授权/条款、Coinbase行情及不可变首次入库绑定、预测市场筛选和EU本机3109。PASS-only、公开最低10、精选60/65/76、理解50、48h资格、旧分析复用、稳定人工身份、CNY预留结算、shared凭据熔断、unknown核账、日报08:00与不补历史均保留。来源/模型/预算运营配置不被种子覆盖。

新增browseFloor=10、classes为空。新增卡片额外模型去重和反馈判噪默认关闭；fallback框架保留但没有本站fallbackFor预设。GLM原评分参数1/65536/180000迁移到站点scoreCall。EU停止宽限由210秒适配为515秒，搭配上游470秒排空。原73项SQL逐字不变，新增12项按完整文件名执行；价格证据hook与历史迁移依据保留。

## 本地验证

- 后端与模块1186/1186，网页80/80，无失败/跳过；typecheck、生产网页构建、迁移安全检查通过。
- 30项页面/API/RSS/Agent/MCP/分享图烟测通过；独立MCP标准契约通过。空本地库没有为验证而生成报告或调用真实模型。
- 新付费默认关闭、GLM评分参数及fallback独立预算均观察红灯后修复绿灯；完整费用专项109项和恢复/翻译26项通过。
- 47项旧库→真实73项生产历史→85项新库并二次空迁移通过；旧价格证据、unknown金额、来源和BTC绑定保存。
- 首次合并前基线895项中10项因未先构建网页或SQL_ASCII环境失败；改为UTF8、完成构建后相关13项全过。合并首轮5项失败已逐项修正，保留严格核账合同，不删除失败测试。
- 独立Spec审查发现GLM参数迁移遗漏，补回原值并通过实际HTTP参数红绿回归后通过复审；独立代码质量及保全脚本审查未发现阻断项。
- 真实公开RSS固定字节回放4源775条，条数、URL、标题、发布时间、正文状态一致；775条新增日期精度，32条另有原订阅图片恢复或实体解码变化，已核对。[样本说明](2026-11-04-upstream-release/source-summary.md)。BitcoinCore部分下载失败，未计入成功。
- 全部数据库/模型回归使用独立本机PostgreSQL17、loopback假服务和外网阻断；本机Node26，生产镜像另用Node24验证。GitHub Actions未触发：现工作流只在main push/PR/手动触发，本机gh认证失效，不把本地测试写成CI通过。

## 生产发布

应用镜像 `ninebtc-upstream:7a03ab1`，ID `sha256:3575d1b9f8716d396ce6c5b6dcf3e010688cdd99ae2ed358d859d67397c48941`，三个应用容器一致；Node `v24.22.2`，均运行中、重启0，worker停止宽限515秒。生产备份先在无外网独立PostgreSQL容器恢复，迁移73→85，二次执行0；正式冻结窗口又保存并实际恢复最终备份，再迁移并重复全量保全核对。

| 验收 | 结果 |
| --- | --- |
| 迁移 | 73→85，精确12项，二次为空操作 |
| 原始业务表 | 原56张业务表全部旧列全行指纹一致（另含原迁移账本行保全）；新增1张反馈状态表 |
| 公开/精选集合 | 所有持久化集合身份及字段摘要不变，详情见[生产保全](2026-11-04-upstream-release/production-conservation.json) |
| 运行配置 | 旧环境值全部保持；只预期更新Node版本、release标识和worker停止宽限；原.env逐字一致 |
| 模型金额策略/来源 | enabled=False，日/滚动值9.0/9.0元；来源109个、启用79个，全文展示及再分发仍为0；未seed覆盖 |
| 页面与出口 | 服务器本机、公网及本机独立公网各30项烟测通过，独立MCP标准契约通过 |
| 实际worker | 心跳release为7a03ab1，观察时新版本有14个成功任务、无失败，含sources.schedule、market.btc-usd、hot.rank、ops.recover、reports.compose |
| 浏览器 | 真实线上Chromium1440px与393px仿真视口检查，品牌/BTC/筛选保持，无横向溢出；不代表物理手机或微信内置浏览器验收 |
| 定时备份 | 原timer恢复active，未改变其启用设置 |

[桌面截图](2026-11-04-upstream-release/production-desktop.png)、[手机视口截图](2026-11-04-upstream-release/production-phone.png)。

备份位于服务器受限目录 `/srv/9btc-release-backups/upstream-20261104`，最终数据库SHA256 `c812163fbdc2f522dfe94a95af9b13c17e246aab41a2193f1248eae6acd59f5d`，完整数据卷SHA256 `e888c0f793f9b28421ec843ba9d5d1b68485cd735f8494e40f9059ea372ed757`。最终数据库备份实际恢复至独立测试库成功；旧镜像 `ninebtc-grouping:1ec8be0` 和原Compose保留可回退。未把dump、环境文件、凭据或原始私密内容提交到仓库。

机器可读最终验收：[verification.json](2026-11-04-upstream-release/verification.json)。完整决策以[长期差异化决策](../9btc-upstream-decisions.md)为准。

本次本地API/web/独立PostgreSQL已停止；服务器三个人工验收容器及其测试卷已删除，临时数据库连接文件已删除。生产数据库卷、应用数据卷、最终备份和旧镜像保留。
