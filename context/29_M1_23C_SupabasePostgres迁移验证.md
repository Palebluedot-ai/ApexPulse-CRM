# M1.23C Supabase Postgres 迁移验证

## 1. 文档目的

这份文档定义 M1.23C 的实现范围、环境变量、验证命令和安全边界。

这份文档是自包含文档。

阅读这份文档不需要依赖其他文档。

M1.23C 的目标是：

```text
让当前数据库 schema 可以安全跑在 Supabase Postgres 上，并提供只读 readiness 检查。
```

这一步不要求马上连接真实 Supabase。

这一步先把迁移和检查工具准备好。

## 2. 当前主线

当前部署主线：

```text
Vercel + Supabase Postgres + Supabase Storage + Cloudflare 域名
```

M1.23C 只处理 Postgres 迁移和检查。

M1.23C 不处理：

- 不配置 Vercel
- 不配置 Cloudflare DNS
- 不切 Supabase Auth
- 不上传真实截图
- 不删除任何数据库数据
- 不 drop table
- 不重做 migration

## 3. 已完成代码

新增数据库 readiness 模块：

```text
src/server/db/readiness.ts
```

新增测试：

```text
src/server/db/readiness.test.ts
```

更新数据库环境配置：

```text
src/server/db/env.ts
src/server/db/client.ts
drizzle.config.ts
```

新增命令：

```bash
pnpm db:check
```

## 4. 核心表

当前 CRM 必须存在的核心表：

- `users`
- `parties`
- `events`
- `attachments`
- `tasks`

`pnpm db:check` 会只读检查这些表是否存在。

这个命令不会写数据。

这个命令不会迁移数据库。

这个命令不会删除数据。

## 5. 环境变量

### 5.1 DATABASE_URL

用途：

```text
应用运行时连接数据库。
```

local：

```text
postgres://postgres:postgres@localhost:5432/hashkey_otc_crm_v1
```

staging / production：

```text
填写 Supabase runtime connection string。
```

如果使用 Supabase pooler，建议同时设置：

```text
DATABASE_PREPARE=false
```

原因：

```text
Supabase 官方 Drizzle 文档建议连接池场景使用 prepare: false。
```

### 5.2 MIGRATION_DATABASE_URL

用途：

```text
只给 drizzle-kit migration 使用的数据库连接字符串。
```

优先级：

```text
MIGRATION_DATABASE_URL > DATABASE_URL
```

也就是说：

```text
pnpm db:migrate
```

会优先使用 `MIGRATION_DATABASE_URL`。

建议：

- 如果 Supabase 提供 direct connection，并且本机网络支持，就把 direct connection 放在 `MIGRATION_DATABASE_URL`
- 如果 direct connection 不可用，再使用 Supabase 推荐的可迁移连接方式
- 不要把这个变量提交到 Git

### 5.3 DATABASE_PREPARE

用途：

```text
控制 Postgres.js 是否启用 prepared statements。
```

local 默认：

```text
DATABASE_PREPARE=true
```

Supabase pooler runtime 建议：

```text
DATABASE_PREPARE=false
```

## 6. 命令

### 6.1 本地 DB 检查

```bash
pnpm db:check
```

当前本地验证结果：

```text
Database: hashkey_otc_crm_v1
Schema: public
Prepared statements: true
Missing tables: none
```

### 6.2 运行 migration

local migration：

```bash
pnpm db:migrate:local
```

环境变量 migration：

```bash
pnpm db:migrate
```

安全规则：

```text
只有确认 DATABASE_URL 或 MIGRATION_DATABASE_URL 指向正确 Supabase 项目后，才能运行 pnpm db:migrate。
```

## 7. Supabase 上的推荐验证顺序

第一步，填写本机 `.env.local`：

```text
DATABASE_URL=你的 Supabase runtime connection string
MIGRATION_DATABASE_URL=你的 Supabase migration connection string
DATABASE_PREPARE=false
```

第二步，检查当前连接到哪里：

```bash
pnpm db:check
```

如果输出的 database/schema 正确，但缺少核心表，这是预期状态。

第三步，运行 migration：

```bash
pnpm db:migrate
```

第四步，再检查：

```bash
pnpm db:check
```

期望：

```text
Missing tables: none
```

第五步，seed 默认用户：

```bash
pnpm db:seed:local
```

注意：

当前 seed 命令名字叫 `db:seed:local`，但它实际会读取当前 `DATABASE_URL`。

运行前必须确认 `DATABASE_URL` 指向你想 seed 的数据库。

## 8. 必须暂停确认的动作

以下动作必须暂停确认：

- 删除 Supabase 数据
- drop table
- truncate table
- reset database
- 删除 migration 文件
- 重做 migration
- 把真实数据库连接字符串提交到 Git
- 把真实客户数据导入云端

## 9. 当前验证结果

单测：

```bash
pnpm test src/server/db/env.test.ts
pnpm test src/server/db/readiness.test.ts
```

结果：

```text
通过。
```

本地 DB readiness：

```bash
pnpm db:check
```

结果：

```text
通过。五张核心表全部存在。
```

完整项目验证：

```bash
pnpm check
pnpm build
```

结果：

```text
通过。当前共 27 个测试文件、117 个测试。
```

## 10. 下一步

下一步建议进入：

```text
M1.23D：Vercel 部署准备。
```

但在真正部署前，Chao 需要准备：

- Supabase Project URL
- Supabase Postgres runtime connection string
- Supabase migration connection string
- Supabase Storage bucket
- Supabase service role key
- Vercel project
- Cloudflare 域名

这些真实值只应该写入 `.env.local` 或 Vercel 环境变量。

不要发到聊天里。
