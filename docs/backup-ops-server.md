# 9BTC 本机与异地备份

2026-09-30 决定：EU 服务器只在本机生成备份，**不主动连接其他服务器**；OPS 的 naban 服务器（`110.42.197.165`）每天主动连接 EU（`62.171.163.77`）拉取完整快照。旧 9btc 服务器不参与。

## 密钥与访问边界

SSH 私钥只在 naban 上生成和保存，绝不传给本机或 EU；EU 的 `authorized_keys` 只放对应**公钥**。EU 使用独立的 `ninebtc_pull` 无密码账号，没有 sudo 权限。该账号的公钥授权仅接受 naban 来源 IP、禁用转发和伪终端，并强制执行只读 SFTP。9BTC 备份目录由 root 写入、该账号只读；服务器上其他文件仍受原有 Unix 文件权限约束。naban 预先核对 EU 的 SSH 主机公钥并固定到专用 known_hosts。密钥、备份数据和主机公钥均不入 Git。

## 计划与留存

- EU 北京时间每天 04:10 运行 [本机备份脚本](../deploy/local-backup.sh)：从 PostgreSQL 容器导出 custom-format 数据库、打包 `/data/uploads`，验证两者可读，生成 SHA-256 清单，最后原子更新 `latest`。目录 `/var/backups/ninebtc` 由 root 写入，仅 `ninebtc_pull` 组可读。EU 保留最近约四天的完整文件。这个任务没有远程备份地址或 SSH 密钥。
- naban 北京时间每天 04:40 运行 [主动拉取脚本](../deploy/pull-backup.sh)：只通过受限 SFTP 读取 `latest` 指向的三份文件，在 naban 私有暂存目录校验 SHA-256 后才移入 `/srv/ninebtc-backup/daily/`。每周日和每月一日用硬链接另存周/月副本。每日、每周、每月分别保留约 7、28、92 天。只清理由本脚本创建的目录中的过期文件。
- 站点反馈截图不在 `/data/uploads` 包内；反馈数据库记录包含在数据库导出中。按站长决定，本次不调整公开隐私页。

## 安装和验收

1. 在 EU 安装独立账号和公钥授权，并先验证强制只读 SFTP；从 naban 尝试读取备份目录应成功，写入应被拒绝。
2. 在 EU 安装 `ninebtc-local-backup.service/timer`，手动运行一次，检查 `pg_restore --list`、文件包目录及 SHA-256 清单；确认不连接 naban。
3. 在 naban 安装 `ninebtc-pull-backup.service/timer`，手动运行一次；比较 naban 文件 SHA-256 与 EU 清单。
4. 将从 naban 实际取得的数据库文件恢复到**EU 上新建的独立测试数据库**，核对迁移表和业务表；绝不覆盖站点业务库。首次成功恢复后才视异地备份生效。
5. 检查两台机器定时器已启用及下一次执行时间。每天查看失败状态；备份超过一天未更新时应排查。

## 实施记录

此前 EU 主动推送方案没有部署；仓库已改为上述主动拉取方案。2026-09-30 实测：naban 上生成专用 Ed25519 密钥，私钥只留 naban；EU 加入公钥并强制只读 SFTP。naban 可读取 EU 快照，写入请求被拒绝；两端所见 EU 主机指纹一致，naban 已固定该主机公钥。

EU 通过 systemd 服务生成最新快照 `20260930T144528Z`，本机校验通过。naban 通过 systemd 服务拉取该快照并校验 SHA-256，`Result=success`。此前一份从 naban 实际取回的快照 `20260930T143902Z` 已在 EU 恢复到独立测试库 `ninebtc_offsite_verify_20260930_test`，得到 39 条迁移记录、0 个信源，业务库未触碰。两台定时器均已启用，下一次分别为北京时间 2026-10-01 04:10、04:40；自动执行的首轮结果仍需在当天核对。本次不调整公开隐私页。

2026-10-01 北京时间 04:10:16，EU `ninebtc-local-backup.timer` 首轮自动触发，服务 `Result=success`、`ExecMainStatus=0`；下一次为 2026-10-02 北京时间 04:10。naban 04:40 首轮拉取结果待到时核对。
