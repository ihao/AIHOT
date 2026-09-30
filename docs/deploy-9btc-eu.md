# 9BTC EU 上线手册

这份手册只适用于 `62.171.163.77` 上的独立 9BTC 项目。站长已将 `9btc.com` 的 A 记录切到 EU；现有旧服务器不做任何变更。EU 上的其他 Docker 项目和 Caddy 站点保持原样。

## 上线门槛

1. 审核/发布门禁完成，PostgreSQL 17 全量测试、网页构建、Docker 烟测通过；旧 AIHOT 公开记录升级后默认不可见。
2. Web3 信源专题完成，站长确认首批信源和样本评分。首次私有验收可保持零信源；正式上线不得把空站误称为已具备资讯服务。
3. 站长确认运营主体、联系方式、使用规则和隐私说明。`industry/pages/` 中的原框架模板不能直接上线。
4. 模型服务、预算和凭据就位，并通过少量真实样本验证。默认关闭采集和模型调用。
5. 配置异机备份目的地，并实测一次导出与恢复；不得仅依赖同机 Docker 卷。

## 隔离部署

`deploy/eu.compose.yml` 使用独立的 `ninebtc` Compose 项目、PostgreSQL 17 数据卷和应用数据卷，只把网页绑定在 EU 本机 `127.0.0.1:3109`。它不启动第二个 Caddy，不占用现有 80/443、3000/3001 或 5432 端口。首次启动时 `.env` 中保持 `COLLECT_ENABLED=false`、`MODEL_CALLS_ENABLED=false`、`FEISHU_CONTENT_PUSH_ENABLED=false`、`INDEXNOW_SUBMIT_ENABLED=false`。

部署目录、镜像和卷先检查磁盘空间与现有容器，然后把经过测试的**固定提交**检出到新的目录。`.env` 由服务器上权限受限的文件提供，不进 Git、日志或命令输出；至少设置 `SITE_URL=https://9btc.com`、`ADMIN_PASSWORD`、`SESSION_SECRET`、`IMG_PROXY_SIGN_SECRET`、`POSTGRES_PASSWORD`、`TRUST_PROXY=true`。管理员密码至少 12 位，其余密钥使用独立随机值。Compose 文件以缺少数据库密码即报错的方式关闭默认弱密码。

启动命令在仓库根目录执行：

```bash
docker compose --env-file .env -f deploy/eu.compose.yml up -d --build
docker compose --env-file .env -f deploy/eu.compose.yml ps
```

私有验收通过 SSH 隧道访问 `127.0.0.1:3109`，检查首页、`/admin`、健康接口、RSS、API、MCP、审核队列和日报草稿。验收数据使用合成样本，采集和模型调用仍关闭。公开出口必须对待审、驳回内容返回不可见。失败时停止 9BTC 项目即可，不能使用 `down -v` 删除卷。

## 已切换域名后的发布

DNS 已先于应用发布完成切换。私有验收通过后，把已校验的 `deploy/9btc.eu.caddy` 单独安装到现有 `/etc/caddy/sites-enabled/9btc.com.caddy`，反向代理到 `127.0.0.1:3109`，保留现有站点配置；先备份 Caddy 配置，再运行 `caddy validate`，最后平滑重载。确认 `https://9btc.com` 证书、首页、管理登录、健康接口和公开出口均正常；`www.9btc.com` 应跳转到根域。旧服务器无需改动。

2026-09-30 已向两台权威 NS 和 Google 公共 DNS 核对：根域 A 均返回 `62.171.163.77`；`www` 仍是指向根域的 CNAME。应用尚未部署时，HTTP 跳转到 HTTPS，而 HTTPS 握手失败；发布时必须把证书和站点访问一起验收。[GoDaddy 官方 A 记录说明](https://www.godaddy.com/en-uk/help/add-or-edit-an-a-record-42546) 留作必要时的回退参考。

## 备份和回退

正式开放前实测数据库备份与**独立临时数据库**恢复；记录对象存储备份位置、保留期和告警。9BTC 运行故障时可以从 Caddy 撤掉 9BTC 站点或回退到前一个已验证镜像/提交，同时保留数据库卷；涉及迁移时先验证向后兼容性和备份可恢复性。DNS 切换后保留旧站不动，必要时由站长改回 A 记录。

## 已核实的 EU 环境（2026-09-30）

Docker Compose v5.1.3 可用，现有 Caddy 管理 80/443，站点配置通过 `/etc/caddy/sites-enabled/*.caddy` 导入；本机 3000、3001、5432 已由其他服务使用，3109 空闲。以上是一次只读检查结果，执行部署前应重新确认。

域名 NS 为 `ns43.domaincontrol.com` / `ns44.domaincontrol.com`；根域 A 已切到 `62.171.163.77`，`www` 是指向根域的 CNAME。部署前再次查询，避免依据过期的 DNS 状态操作。
