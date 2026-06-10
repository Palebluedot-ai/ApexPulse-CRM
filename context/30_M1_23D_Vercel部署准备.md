# M1.23D Vercel 部署准备

## 1. 文档目的

这份文档定义 M1.23D 的实现范围、部署前检查、Vercel 环境变量和验收方式。

这份文档是自包含文档。

阅读这份文档不需要依赖其他文档。

M1.23D 的目标是：

```text
在不配置真实账号、不提交真实 key 的前提下，让项目具备上 Vercel staging 的基本准备。
```

## 2. 当前主线

当前部署主线：

```text
Vercel + Supabase Postgres + Supabase Storage + Cloudflare 域名
```

M1.23D 只做部署准备。

M1.23D 不做：

- 不登录 Vercel
- 不创建 Vercel project
- 不填写 Vercel 环境变量
- 不配置 Cloudflare DNS
- 不运行真实 Supabase migration
- 不提交任何真实 key

## 3. 已完成代码

新增健康检查 endpoint：

```text
GET /api/health
```

实现文件：

```text
src/app/api/health/route.ts
src/server/health/health.ts
```

测试文件：

```text
src/server/health/health.test.ts
```

健康检查返回：

```json
{
  "ok": true,
  "app": "apexpulse-crm",
  "checkedAt": "ISO timestamp"
}
```

这个 endpoint 不返回：

- 数据库 URL
- API key
- 用户数据
- 真实截图信息
- 环境变量值

## 4. 已完成部署忽略配置

新增：

```text
.vercelignore
```

忽略：

- `data/`
- `node_modules/`
- `.next/`
- `.env`
- `.env.local`
- `.env.*.local`
- log / pid / dump 文件

目的：

```text
避免把本地数据、环境文件或构建产物带入 Vercel 部署包。
```

## 5. Vercel Project 建议配置

Framework：

```text
Next.js
```

Install command：

```text
pnpm install
```

Build command：

```text
pnpm build
```

Output：

```text
Next.js 默认输出，不需要手动配置。
```

## 6. Vercel 环境变量

staging 必填：

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
- `DATABASE_PREPARE=false`

可选：

- `MIGRATION_DATABASE_URL`

注意：

```text
MIGRATION_DATABASE_URL 不一定需要放进 Vercel。
```

原因：

```text
migration 建议从本机或 CI 明确执行，不建议 Vercel runtime 自动执行 migration。
```

## 7. 部署前本地检查顺序

第一步：

```bash
pnpm env:check staging
```

期望：

```text
Missing required keys: none
Warnings: none
```

第二步：

```bash
pnpm db:check
```

期望：

```text
Missing tables: none
```

第三步：

```bash
pnpm check
```

第四步：

```bash
pnpm build
```

第五步，部署后检查：

```text
https://你的域名/api/health
```

期望：

```json
{
  "ok": true,
  "app": "apexpulse-crm"
}
```

## 8. 部署后手机验收

部署成功后，手机验收顺序：

1. 打开 HTTPS 域名
2. 打开 `/api/health`
3. 打开 `/login`
4. 登录
5. 打开 `/dogfood/mobile`
6. 上传一张真实微信截图
7. 进入 `/review`
8. AI 提取字段
9. 人工确认
10. 查看客户详情
11. 查看任务
12. 查看 weekly report

## 9. 必须暂停确认的动作

以下动作必须暂停确认：

- 把真实 key 发到聊天里
- 把真实 key 提交到 Git
- 在 Supabase 上 drop table
- 在 Supabase 上 reset database
- 在 Vercel 上配置 production 域名
- 把真实客户数据批量导入云端
- 切 Supabase Auth

## 10. 下一步

当前完整验证：

```bash
pnpm check
pnpm build
```

结果：

```text
通过。当前共 28 个测试文件、118 个测试。
```

下一步建议：

```text
Chao 在本机 .env.local 或 Vercel Dashboard 准备 staging 环境变量。
```

准备好后，继续：

```text
M1.23E：真实 Supabase + Vercel staging 首次部署。
```

M1.23E 才会真正接触真实账号和环境变量。
