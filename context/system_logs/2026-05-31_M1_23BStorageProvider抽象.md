# 2026-05-31 M1.23B Storage Provider 抽象执行日志

## 1. 背景

当前部署主线已经确定为：

```text
Vercel + Supabase Postgres + Supabase Storage + Cloudflare 域名
```

Vercel 不能依赖本地 `data/attachments/` 长期保存上传截图。

因此需要在部署前先抽象附件存储层。

## 2. 本轮目标

本轮目标：

```text
让图片上传业务不关心底层保存到本地还是 Supabase Storage。
```

本轮不做：

- 不连接真实 Supabase
- 不上传真实截图到 Supabase
- 不配置 Vercel
- 不配置 Cloudflare
- 不提交真实 key

## 3. 已完成

新增：

```text
src/server/capture/image-storage-provider.ts
```

新增测试：

```text
src/server/capture/image-storage-provider.test.ts
```

更新：

```text
src/app/api/capture/image/route.ts
src/app/api/attachments/[id]/route.ts
src/server/review/review-page-model.ts
src/server/review/review-page-model.test.ts
README.md
context/00_文档总览.md
context/27_M1_23A_环境变量与云端部署Checklist.md
```

新增文档：

```text
context/28_M1_23B_StorageProvider抽象.md
```

## 4. 关键决策

storage key 前缀：

```text
local-images/
supabase-images/
```

local provider：

```text
继续写入 data/attachments/
```

supabase provider：

```text
通过服务端 HTTP API 上传到 Supabase Storage
```

上传使用：

```text
x-upsert: false
```

原因：

```text
CRM 原始截图证据不应该被同路径文件无声覆盖。
```

## 5. 当前验证结果

targeted tests：

```bash
pnpm test src/server/capture/image-storage-provider.test.ts
pnpm test src/server/review/review-page-model.test.ts
```

结果：

```text
通过。
```

完整验证：

```bash
pnpm check
pnpm build
```

结果：

```text
通过。当前共 26 个测试文件、113 个测试。
```

中途发现：

```text
review-page-model 被 review-client 间接引入 client bundle。
```

第一次实现时，review-page-model import 了 server-only 的 image-storage-provider。

这导致 build 报错：

```text
the chunking context does not support external modules (request: node:fs/promises)
```

修复：

```text
新增 src/lib/storage-keys.ts，把可预览 storage key 判断拆成纯函数。
```

这样 client bundle 不再引入 `node:fs/promises`。

## 6. 下一步

下一步建议进入：

```text
M1.23C：Supabase Postgres 迁移验证。
```

目标：

```text
让当前 schema 可以安全跑在空 Supabase Postgres 上。
```
