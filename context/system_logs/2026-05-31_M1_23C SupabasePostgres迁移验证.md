# 2026-05-31 M1.23C Supabase Postgres 迁移验证执行日志

## 1. 背景

当前部署主线是：

```text
Vercel + Supabase Postgres + Supabase Storage + Cloudflare 域名
```

M1.23A 已完成环境变量检查。

M1.23B 已完成 Storage Provider 抽象。

M1.23C 需要让数据库迁移和 readiness 检查适配 Supabase Postgres。

## 2. 本轮目标

目标：

```text
提供安全的数据库环境配置、迁移 URL 选择和只读表结构检查命令。
```

本轮不做：

- 不连接真实 Supabase
- 不运行真实 Supabase migration
- 不删除任何数据
- 不 drop table
- 不提交真实数据库 URL

## 3. 已完成

新增：

```text
src/server/db/readiness.ts
src/server/db/readiness.test.ts
scripts/check-db.ts
context/29_M1_23C_SupabasePostgres迁移验证.md
```

更新：

```text
src/server/db/env.ts
src/server/db/env.test.ts
src/server/db/client.ts
drizzle.config.ts
package.json
.env.example
README.md
context/00_文档总览.md
```

新增命令：

```bash
pnpm db:check
```

## 4. 关键决策

新增：

```text
MIGRATION_DATABASE_URL
```

用途：

```text
只给 drizzle-kit migration 使用。
```

优先级：

```text
MIGRATION_DATABASE_URL > DATABASE_URL
```

新增：

```text
DATABASE_PREPARE
```

用途：

```text
控制 Postgres.js prepared statements。
```

Supabase pooler runtime 建议：

```text
DATABASE_PREPARE=false
```

原因：

```text
Supabase 官方 Drizzle 文档建议连接池场景使用 prepare: false。
```

## 5. 验证结果

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
Database: apexpulse_crm
Schema: public
Prepared statements: true
Missing tables: none
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

## 6. 下一步

下一步建议进入：

```text
M1.23D：Vercel 部署准备。
```

但在真正运行 Supabase migration 前，需要 Chao 在本机 `.env.local` 填写 Supabase 的真实连接字符串。

真实连接字符串不应该发到聊天里。
