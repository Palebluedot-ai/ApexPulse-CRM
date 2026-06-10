# M1.23A 环境变量与云端部署 Checklist

## 1. 文档目的

这份文档定义 M1.23A 的交付内容、环境变量清单、验证命令和下一步。

这份文档是自包含文档。

阅读这份文档不需要依赖其他文档。

M1.23A 的目标是：

```text
在不提交任何真实 key 的前提下，把本地、staging、production 需要的环境变量梳理清楚，并提供可执行检查命令。
```

## 2. 当前部署主线

当前部署主线确定为：

```text
Vercel + Supabase Postgres + Supabase Storage + Cloudflare 域名
```

分工如下：

- Vercel 运行 Next.js 应用
- Supabase Postgres 保存客户、事件、任务等结构化数据
- Supabase Storage 保存截图附件
- Cloudflare 管理域名 DNS
- Mac 本地继续用于开发和调试

Mac mini 暂时不作为当前上线主线。

Mac mini 保留为本地开发机、备份实验和未来自托管备选。

## 3. 环境分层

### 3.1 local

local 是本机开发环境。

local 使用：

- Docker Postgres
- 本地 `data/attachments/`
- 本地 `.env.local`
- 本项目自己的 local login

local 不要求 Supabase Storage。

local 可以运行：

```bash
pnpm env:check
```

### 3.2 staging

staging 是手机真实 dogfood 环境。

staging 使用：

- Vercel 部署的 HTTPS URL
- Supabase Postgres
- Supabase Storage
- 外部视觉模型 API
- 本项目自己的 local login

staging 需要运行：

```bash
pnpm env:check staging
```

### 3.3 production

production 是未来长期正式环境。

当前 M1.23 不急着区分 staging 和 production。

建议先让 staging 跑 1 到 2 天真实使用，再决定是否复制一套 production。

production 需要运行：

```bash
pnpm env:check production
```

## 4. 环境变量清单

### 4.1 数据库

`DATABASE_URL`

用途：

```text
Postgres 连接字符串。
```

local 示例：

```text
postgres://postgres:postgres@localhost:5432/apexpulse_crm
```

staging / production：

```text
填写 Supabase Postgres 连接字符串。
```

注意：

- 这个变量是 secret
- 不要提交到 Git
- 不要贴到聊天记录里

### 4.2 登录

`LOCAL_AUTH_EMAIL`

用途：

```text
第一版登录邮箱。
```

`LOCAL_AUTH_PASSWORD`

用途：

```text
第一版登录密码。
```

`AUTH_SESSION_SECRET`

用途：

```text
签发登录 cookie 的密钥。
```

`AUTH_STRICT_ENV`

用途：

```text
云端环境必须设置为 true，避免缺少登录配置时继续使用本地默认值。
```

`AUTH_COOKIE_SECURE`

用途：

```text
云端 HTTPS 环境必须设置为 true。
```

当前决策：

```text
M1.23 继续使用现有登录，不切 Supabase Auth。
```

原因：

- 当前目标是先把手机真实闭环跑到公网 HTTPS
- 现在切 Supabase Auth 会把部署任务变成登录重构
- 团队权限和正式 Auth 可以放到后续里程碑

### 4.3 视觉 API

`VISION_API_PROVIDER`

用途：

```text
预留 provider 标签，当前可以填 openai-compatible。
```

`VISION_API_KEY`

用途：

```text
外部视觉模型 API key。
```

`VISION_API_BASE_URL`

用途：

```text
OpenAI-compatible chat completions base URL。
```

`VISION_API_MODEL`

用途：

```text
视觉模型名称。
```

注意：

- `VISION_API_KEY` 是 secret
- 不要提交到 Git
- M1.23 staging 需要真实配置，否则手机上传后不能完成 AI 提取

### 4.4 附件存储

`STORAGE_PROVIDER`

用途：

```text
控制附件存储后端。
```

local：

```text
local
```

staging / production：

```text
supabase
```

`SUPABASE_URL`

用途：

```text
Supabase project URL。
```

`SUPABASE_SERVICE_ROLE_KEY`

用途：

```text
服务端写入 Supabase Storage 的 service role key。
```

`SUPABASE_STORAGE_BUCKET`

用途：

```text
保存截图附件的 Supabase Storage bucket 名称。
```

建议 bucket 名称：

```text
otc-crm-attachments
```

注意：

- `SUPABASE_SERVICE_ROLE_KEY` 是 secret
- 只能放在服务端环境变量里
- 不要暴露给浏览器
- 不要提交到 Git

### 4.5 应用地址

`APP_BASE_URL`

用途：

```text
当前环境的公开访问地址。
```

local 示例：

```text
http://localhost:3000
```

staging 示例：

```text
https://crm.example.com
```

## 5. 新增命令

当前新增命令：

```bash
pnpm env:check
```

默认检查 local。

也可以指定环境：

```bash
pnpm env:check staging
pnpm env:check production
```

命令行为：

- 自动读取 `.env`
- 自动读取 `.env.local`
- shell 环境变量优先级最高
- 只显示已配置的 key 名
- 不显示任何 secret 值
- 缺少必需变量时返回失败
- 云端安全开关不正确时返回失败

## 6. 当前验证结果

local 当前验证结果：

```text
pnpm env:check
```

结果：

```text
通过。local 必需变量齐全。
```

staging 当前验证结果：

```text
pnpm env:check staging
```

结果：

```text
失败。原因是还没有填写 Supabase Storage、APP_BASE_URL，并且云端 auth 安全开关仍是 local 值。
```

staging 需要补齐：

- `STORAGE_PROVIDER=supabase`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`
- `APP_BASE_URL`
- `AUTH_STRICT_ENV=true`
- `AUTH_COOKIE_SECURE=true`

## 7. Vercel 配置 Checklist

Vercel 项目环境变量需要填写：

- `DATABASE_URL`
- `LOCAL_AUTH_EMAIL`
- `LOCAL_AUTH_PASSWORD`
- `AUTH_SESSION_SECRET`
- `AUTH_STRICT_ENV=true`
- `AUTH_COOKIE_SECURE=true`
- `VISION_API_PROVIDER=openai-compatible`
- `VISION_API_KEY`
- `VISION_API_BASE_URL`
- `VISION_API_MODEL`
- `STORAGE_PROVIDER=supabase`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`
- `APP_BASE_URL`

不要填写：

- `.env.local` 文件内容
- 本机 `data/attachments/` 路径
- 任何 GitHub token
- 任何不属于这个项目的公司密钥

## 8. Supabase 配置 Checklist

Supabase 需要准备：

- 一个 Supabase project
- 一个 Postgres connection string
- 一个 Storage bucket
- 一个 service role key

Storage bucket 建议：

```text
otc-crm-attachments
```

第一版 bucket 可以先设为 private。

原因：

```text
截图证据不应该变成公开 URL。
```

后续 Review 图片预览可以通过服务端接口读取和转发。

## 9. 当前不做的事

M1.23A 不做：

- 不连接真实 Supabase
- 不运行 Supabase migration
- 不上传真实截图到 Supabase Storage
- 不切 Supabase Auth
- 不配置 Vercel 项目
- 不配置 Cloudflare DNS
- 不提交 `.env.local`
- 不提交真实 API key

这些会在后续 M1.23B 到 M1.23F 分步完成。

## 10. 下一步

M1.23B 已经完成：

```text
Storage Provider 抽象。
```

已经实现：

- local provider
- supabase provider
- 上传 API 接入 provider
- 附件读取 API 接入 provider
- Review 页面支持 Supabase 图片预览

下一步建议进入：

```text
M1.23C：Supabase Postgres 迁移验证。
```

完成 M1.23B 后，Vercel 才能真正处理手机上传截图。
