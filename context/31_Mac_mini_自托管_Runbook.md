# Mac mini 自托管 Runbook

## 1. 目的与边界

这份文档定义如何把本项目部署在一台 24 小时运行的 Mac mini 上，并通过 Cloudflare Tunnel 暴露成公网 HTTPS 地址，供手机真实 dogfood 使用。

这份文档是自包含文档。阅读它不需要依赖其他文档。

边界说明：

- 这是一条**可选的自托管路径**，不替代现有 Vercel + Supabase 部署主线。
- 选择自托管的最大价值是：敏感客户数据留在公司机器上，不出境、不交第三方云。
- 复用本项目已有的 local 路径：docker Postgres + `STORAGE_PROVIDER=local` 本地附件 + `next start`。
- 本文档不引入新的应用代码依赖，只增加运维脚本和配置。

必须暂停确认的动作（沿用项目红线）：

- 用真实客户数据跑这套环境，必须先经 Chao 和公司 IT / 合规确认。
- 在公司 Mac mini 上长期运行个人项目并存放真实客户数据，属于产品边界变化，需要 Chao 拍板。
- 不要在公网暴露状态下使用 docker 默认数据库密码 `postgres`。
- 不要把 `.env.local`、`data/`、Cloudflare tunnel 凭证提交到 Git。

注意：AI 视觉提取仍然会把截图发送到外部 Vision API。自托管只解决数据库和附件的归属问题，不解决 Vision API 外发问题。真实截图的外发风险需要另行评估。

---

## 2. 架构

```text
手机 (任意网络)
  └─ https://crm.你的域名         (Cloudflare 边缘)
        └─ Cloudflare Tunnel       (cloudflared，出站连接，无需公网 IP / 端口转发)
              └─ Mac mini
                    ├─ Next.js 应用   next start  ->  127.0.0.1:3000   (launchd 守护)
                    ├─ Postgres        docker compose                  (restart: unless-stopped)
                    └─ 附件             data/attachments/               (本地磁盘)
```

数据全部留在 Mac mini：

- 结构化数据在 docker Postgres 卷里。
- 截图证据在 `data/attachments/`。
- 每日备份在仓库外的 `~/otc-crm-backups/`。

---

## 3. 前置条件

Mac mini 上需要：

- macOS，建议保持常开、关闭自动睡眠（`系统设置 -> 锁定屏幕 / 节能` 设为永不睡眠）。
- Docker Desktop 或 colima（用于跑 Postgres）。
- Node.js 22+。
- pnpm（通过 `corepack enable` 启用，版本见 `package.json` 的 `packageManager`）。
- cloudflared（`brew install cloudflared`）。
- 一个已托管在 Cloudflare 的域名（你们已有 Cloudflare DNS）。

确认命令：

```bash
docker --version
node --version
pnpm --version
cloudflared --version
```

---

## 4. Step 1：启动数据库并迁移

在项目根目录：

```bash
docker compose up -d postgres
pnpm install
pnpm db:migrate:local
pnpm db:seed:local   # 可选，仅用于本地验证的 demo 数据
```

验证数据库就绪：

```bash
pnpm db:check
```

应报告五张核心 CRM 表存在。

---

## 5. Step 2：配置 .env.local（公网暴露必须）

自托管要暴露到公网 HTTPS，登录与 cookie 安全项必须正确，否则任何人拿到地址即可访问。

编辑 `.env.local`（这个文件不进 Git，请自己填写）：

```text
DATABASE_URL=postgres://postgres:换成强密码@localhost:5432/hashkey_otc_crm_v1
STORAGE_PROVIDER=local
APP_BASE_URL=https://crm.你的域名

LOCAL_AUTH_EMAIL=你的登录邮箱
LOCAL_AUTH_PASSWORD=换成强密码
AUTH_SESSION_SECRET=换成随机长字符串
AUTH_STRICT_ENV=true
AUTH_COOKIE_SECURE=true

VISION_API_PROVIDER=openai-compatible
VISION_API_KEY=你的视觉模型key
VISION_API_BASE_URL=你的视觉模型base-url
VISION_API_MODEL=你的视觉模型名
```

如果改了数据库密码，记得同步修改 `docker-compose.yml` 的 `POSTGRES_PASSWORD`，并 `docker compose down && docker compose up -d postgres` 重建后重新迁移。

生成随机 `AUTH_SESSION_SECRET`：

```bash
openssl rand -base64 48
```

检查环境变量（只显示已配置的 key 名，不显示值）：

```bash
pnpm env:check
```

---

## 6. Step 3：构建并前台验证

```bash
pnpm check        # lint + typecheck + test，全绿再继续
pnpm build
pnpm start        # 前台启动，监听 127.0.0.1:3000
```

浏览器打开 `http://localhost:3000`，确认能登录、能进 `/capture`。
确认后 `Ctrl+C` 停掉前台进程，下一步交给 launchd 守护。

---

## 7. Step 4：用 launchd 守护应用（开机自启 + 崩溃重启）

创建 `~/Library/LaunchAgents/com.hashkey-otc-crm.app.plist`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.hashkey-otc-crm.app</string>

  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>-lc</string>
    <string>cd /换成/项目/绝对路径 && pnpm start</string>
  </array>

  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>

  <key>StandardOutPath</key>
  <string>/换成/项目/绝对路径/logs/app.out.log</string>
  <key>StandardErrorPath</key>
  <string>/换成/项目/绝对路径/logs/app.err.log</string>
</dict>
</plist>
```

用 `/bin/zsh -lc` 是为了加载登录环境，保证 launchd 能找到 `pnpm` / `node`。
如果仍找不到，把 `pnpm start` 换成 `node` 与 pnpm 的绝对路径（`which node`、`which pnpm` 查到）。

先建日志目录，再加载：

```bash
mkdir -p /换成/项目/绝对路径/logs
launchctl load ~/Library/LaunchAgents/com.hashkey-otc-crm.app.plist
launchctl list | grep hashkey-otc-crm
```

应用现在常驻、开机自启、崩溃自动重启。查看日志：

```bash
tail -f /换成/项目/绝对路径/logs/app.err.log
```

---

## 8. Step 5：Cloudflare Tunnel 暴露公网 HTTPS

cloudflared 免费，出站连接，无需公网 IP、无需在路由器开端口。

登录并创建命名隧道：

```bash
cloudflared tunnel login
cloudflared tunnel create otc-crm
```

`create` 会生成一个隧道 UUID 和一份凭证 JSON（在 `~/.cloudflared/`）。**凭证是 secret，不要提交到 Git。**

创建 `~/.cloudflared/config.yml`：

```yaml
tunnel: otc-crm
credentials-file: /Users/你的用户名/.cloudflared/<隧道UUID>.json

ingress:
  - hostname: crm.你的域名
    service: http://127.0.0.1:3000
  - service: http_status:404
```

把域名指向隧道（自动写 Cloudflare DNS）：

```bash
cloudflared tunnel route dns otc-crm crm.你的域名
```

安装成开机自启的后台服务：

```bash
sudo cloudflared service install
```

验证：

```bash
curl -s https://crm.你的域名/api/health
```

应返回 `{"ok":true,...}`，不含任何 secret。

---

## 9. Step 6：每日备份

备份脚本：`scripts/selfhost/backup.sh`。它从 docker 容器内 `pg_dump` 数据库、打包 `data/attachments/`，输出到仓库外的 `~/otc-crm-backups/`，并按保留天数清理旧备份。

先手动跑一次确认可用：

```bash
bash scripts/selfhost/backup.sh
ls -1 ~/otc-crm-backups
```

创建 `~/Library/LaunchAgents/com.hashkey-otc-crm.backup.plist`，每天凌晨 3:30 跑：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.hashkey-otc-crm.backup</string>

  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>-lc</string>
    <string>cd /换成/项目/绝对路径 && bash scripts/selfhost/backup.sh</string>
  </array>

  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>3</integer>
    <key>Minute</key><integer>30</integer>
  </dict>

  <key>StandardOutPath</key>
  <string>/换成/项目/绝对路径/logs/backup.out.log</string>
  <key>StandardErrorPath</key>
  <string>/换成/项目/绝对路径/logs/backup.err.log</string>
</dict>
</plist>
```

加载：

```bash
launchctl load ~/Library/LaunchAgents/com.hashkey-otc-crm.backup.plist
```

强烈建议：再把 `~/otc-crm-backups/` 定期 `rsync` 到一块外接盘或另一台机器，避免 Mac mini 单点故障导致数据和备份一起丢。

```bash
rsync -a ~/otc-crm-backups/ /Volumes/外接盘/otc-crm-backups/
```

---

## 10. 恢复（谨慎，手动执行）

恢复会覆盖现有数据。先停应用、先确认要恢复哪个备份，再执行。不要在不确定时操作。

```bash
# 1. 停应用，避免写入冲突
launchctl unload ~/Library/LaunchAgents/com.hashkey-otc-crm.app.plist

# 2. 选定一份备份
ls -1 ~/otc-crm-backups

# 3. 恢复数据库（会写入现有库，冲突时先和负责人确认是否重建库）
gunzip -c ~/otc-crm-backups/<时间戳>/db_hashkey_otc_crm_v1_<时间戳>.sql.gz \
  | docker exec -i hashkey-otc-crm-v1-postgres psql -U postgres -d hashkey_otc_crm_v1

# 4. 恢复附件
tar -xzf ~/otc-crm-backups/<时间戳>/attachments_<时间戳>.tar.gz -C data/

# 5. 重新启动应用
launchctl load ~/Library/LaunchAgents/com.hashkey-otc-crm.app.plist
```

不要随手 `drop database` 或删卷。需要重建库时停下来和负责人确认。

---

## 11. 上线前安全 Checklist（公网暴露必查）

- [ ] `.env.local` 没有进 Git，`data/` 没有进 Git，`~/.cloudflared/*.json` 凭证没有进 Git。
- [ ] `LOCAL_AUTH_PASSWORD` 已改成强密码，不是开发默认值。
- [ ] `AUTH_SESSION_SECRET` 是随机长字符串。
- [ ] `AUTH_COOKIE_SECURE=true`、`AUTH_STRICT_ENV=true`。
- [ ] docker Postgres 密码不是默认 `postgres`（公网暴露场景）。
- [ ] Postgres 端口 `5432` 只对本机开放，没有被路由器或防火墙转发到公网。
- [ ] 访问 `https://crm.你的域名/api/health` 正常，且未登录访问业务页会跳登录。
- [ ] 建议在 Cloudflare Zero Trust 给 `crm.你的域名` 加一层 Cloudflare Access（邮箱/SSO 网关），多人使用时尤其推荐。

---

## 12. 验收：手机真实闭环

部署成功后，手机按顺序验收：

1. 打开 `https://crm.你的域名/api/health`
2. 打开 `https://crm.你的域名/login` 并登录
3. 打开 `/dogfood/mobile`
4. 上传一张截图
5. 进入 `/review`
6. 点 AI 提取字段
7. 人工确认
8. 查看客户详情
9. 查看任务
10. 查看周报

---

## 13. 故障排查

应用打不开 / launchd 没起来：

```bash
launchctl list | grep hashkey-otc-crm
tail -n 50 /换成/项目/绝对路径/logs/app.err.log
```

常见原因：plist 里项目路径没替换、launchd 找不到 pnpm（改用 node/pnpm 绝对路径）。

`https://crm.你的域名` 打不开但本机 `localhost:3000` 正常：

```bash
cloudflared tunnel info otc-crm
sudo launchctl list | grep cloudflared
```

通常是 cloudflared 服务没起或 `config.yml` 的 hostname / service 写错。

数据库连不上：

```bash
docker compose ps
docker compose logs postgres | tail -n 30
```

确认容器 `hashkey-otc-crm-v1-postgres` 在跑、健康检查通过。

端口 3000 被占用：先确认占用进程是不是本项目旧实例，确认后再处理，不要盲目 kill。
