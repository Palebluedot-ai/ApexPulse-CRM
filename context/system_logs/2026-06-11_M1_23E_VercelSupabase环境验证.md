# 2026-06-11 M1.23E Vercel + Supabase 环境验证

## 本轮目标

验证 Chao 已填写的 `.env.local` 是否足够支撑 Supabase + Vercel staging 的真实端到端测试，并明确下一步开发动作。

## 已验证内容

### 1. Vercel App Base URL

Vercel 部署页面显示主域名：

```env
APP_BASE_URL=https://apex-pulse-crm.vercel.app
```

选择该主域名作为 `APP_BASE_URL`，不使用一次性 deployment URL。

### 2. 环境变量完整性

执行命令：

```bash
pnpm env:check staging
```

结果：

- `DATABASE_URL` 已配置。
- `DATABASE_PREPARE` 已配置。
- `LOCAL_AUTH_EMAIL` 已配置。
- `LOCAL_AUTH_PASSWORD` 已配置。
- `AUTH_SESSION_SECRET` 已配置。
- `AUTH_STRICT_ENV` 已配置。
- `AUTH_COOKIE_SECURE` 已配置。
- `STORAGE_PROVIDER` 已配置。
- `SUPABASE_URL` 已配置。
- `SUPABASE_SERVICE_ROLE_KEY` 已配置。
- `SUPABASE_STORAGE_BUCKET` 已配置。
- `VISION_API_KEY` 已配置。
- `VISION_API_BASE_URL` 已配置。
- `VISION_API_MODEL` 已配置。
- `APP_BASE_URL` 已配置。

结论：

- 缺失项：无。
- warning：无。

### 3. Supabase 数据库连接

执行命令：

```bash
pnpm db:check
```

结果：

- 已成功连接到 Supabase 数据库。
- Database: `postgres`
- Schema: `public`
- Prepared statements: `false`
- 但业务表尚未创建。

缺失表：

- `users`
- `parties`
- `events`
- `attachments`
- `tasks`

结论：

- 数据库连接串本身能连通。
- 当前不能进入真实业务端到端，因为 Supabase 数据库还没有跑 migration。

### 4. 本地代码质量检查

执行命令：

```bash
pnpm check
```

结果：

- lint 通过，有 1 个 Next.js font warning。
- typecheck 通过。
- vitest 通过。
- 32 个测试文件通过。
- 156 个测试通过。

### 5. 生产构建检查

执行命令：

```bash
pnpm build
```

结果：

- 非沙盒环境下构建通过。
- Next.js 生成了 `/capture`、`/review`、`/customers`、`/tasks`、`/reports/weekly`、`/api/review/vision-extract` 等核心路由。
- 有一个 Next.js 提示：`middleware` 文件约定未来建议改成 `proxy`，这不是当前阻塞项。

## 当前判断

环境变量层面已经准备好。

当前唯一阻塞真实端到端测试的是：

```text
Supabase 数据库没有建表
```

## 下一步建议

### Step 1：确认后执行首次 migration

这是写入 Supabase 数据库结构的动作，会创建业务表，但不是删除数据，也不是 drop table。

建议执行：

```bash
pnpm db:migrate
```

执行后再跑：

```bash
pnpm db:check
```

期望缺失表为 `none`。

### Step 2：确认后 seed 一个测试用户

如果 Supabase 是空库，需要创建至少一个登录用户，否则云端登录无法真实测试。

建议先新增一个 cloud seed 脚本或确认现有 seed 是否可直接用于 cloud，避免误把 local-only 假设带到云端。

### Step 3：进入 C1 手机端真实闭环

完成 migration 和测试用户后，再用手机访问：

```text
https://apex-pulse-crm.vercel.app
```

测试路径：

1. 登录。
2. 上传一张微信截图。
3. 在 review 页面触发 AI 提取。
4. 确认入库。
5. 客户列表看到最新沟通。
6. 客户详情第一屏看到最新沟通卡片。
7. 任务页面看到生成任务。

## 注意事项

- 不要把真实密码、service role key、Vision API key 发到聊天里。
- 如果数据库密码包含特殊字符，必须 URL encode 后再放进连接串。
- `APP_BASE_URL` 已经确定，不再阻塞部署。
