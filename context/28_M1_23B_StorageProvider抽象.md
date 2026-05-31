# M1.23B Storage Provider 抽象

## 1. 文档目的

这份文档定义 M1.23B 的实现范围、技术决策、测试结果和下一步。

这份文档是自包含文档。

阅读这份文档不需要依赖其他文档。

M1.23B 的目标是：

```text
让图片上传业务不关心图片保存到本地还是 Supabase Storage。
```

这一步是 Vercel 部署前的必要工程准备。

原因：

```text
Vercel 运行环境不能依赖本地 data/attachments/ 长期保存上传图片。
```

## 2. 当前主线

当前部署主线是：

```text
Vercel + Supabase Postgres + Supabase Storage + Cloudflare 域名
```

M1.23B 只处理截图附件存储。

M1.23B 不处理：

- 不创建真实 Supabase project
- 不运行真实 Supabase migration
- 不配置 Vercel
- 不配置 Cloudflare DNS
- 不切 Supabase Auth
- 不提交真实 key

## 3. 已完成的代码

新增 Storage Provider：

```text
src/server/capture/image-storage-provider.ts
```

这个 provider 支持两种存储：

```text
local
supabase
```

local 行为：

- 图片保存到本机 `data/attachments/`
- storage key 以 `local-images/` 开头
- 继续使用原来的本地写盘逻辑

supabase 行为：

- 图片上传到 Supabase Storage
- storage key 以 `supabase-images/` 开头
- bucket 名称来自 `SUPABASE_STORAGE_BUCKET`
- 服务端使用 `SUPABASE_SERVICE_ROLE_KEY`
- 上传请求使用 `x-upsert: false`

`x-upsert: false` 的意思是：

```text
同一路径已经存在时，不覆盖旧文件。
```

这个选择符合 CRM 证据保留原则。

原始截图证据不应该被无声覆盖。

## 4. 已接入的业务入口

图片上传 API 已经从固定本地存储改成 provider：

```text
src/app/api/capture/image/route.ts
```

现在上传流程是：

```text
读取图片 -> 选择 storage provider -> 保存图片 -> 创建 pending review event -> 创建 attachment 记录
```

附件读取 API 已经支持 provider：

```text
src/app/api/attachments/[id]/route.ts
```

现在附件读取流程是：

```text
读取 attachment 记录 -> 根据 storage key 读取本地或 Supabase 图片 -> 服务端返回图片 bytes
```

Review 页面模型已支持 Supabase 图片预览：

```text
src/server/review/review-page-model.ts
```

可预览 storage key：

```text
local-images/
supabase-images/
```

其他 legacy key 仍然只保留文件记录，不做 inline preview。

## 5. 环境变量

local 默认行为：

```text
STORAGE_PROVIDER=local
```

staging / production 应使用：

```text
STORAGE_PROVIDER=supabase
SUPABASE_URL=你的 Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=你的 Supabase service role key
SUPABASE_STORAGE_BUCKET=otc-crm-attachments
```

注意：

- `SUPABASE_SERVICE_ROLE_KEY` 是 secret
- 只能配置在服务端环境变量
- 不允许提交到 Git
- 不允许暴露给浏览器

## 6. Supabase Storage API 决策

M1.23B 没有引入 Supabase SDK。

当前直接使用 Supabase Storage HTTP API。

原因：

- 少一个 dependency
- 当前只需要 upload 和 download 两个动作
- 服务端 provider 更容易测试
- 后续如果需要 signed URL 或更复杂权限，再考虑 SDK

上传方式：

```text
POST /storage/v1/object/{bucket}/{path}
```

下载方式：

```text
GET /storage/v1/object/{bucket}/{path}
```

认证方式：

```text
Authorization: Bearer SUPABASE_SERVICE_ROLE_KEY
apikey: SUPABASE_SERVICE_ROLE_KEY
```

## 7. 测试覆盖

新增测试：

```text
src/server/capture/image-storage-provider.test.ts
```

覆盖：

- local provider 会调用本地 writer
- supabase provider 会生成 `supabase-images/` storage key
- supabase provider 会调用 Supabase Storage HTTP API
- supabase provider 不在返回结果中暴露 secret
- 缺少 Supabase 配置时会在上传前报错
- Supabase 图片可以通过服务端 provider 下载

更新测试：

```text
src/server/review/review-page-model.test.ts
```

覆盖：

- `supabase-images/` 图片会显示 `/api/attachments/:id` preview URL
- legacy storage key 仍然不会 inline preview

## 8. 当前验证结果

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

补充发现：

```text
第一次 build 暴露了 server-only provider 被 Review client 间接引入的问题。
```

修复：

```text
把 storage key 预览判断拆到 src/lib/storage-keys.ts，避免 client bundle 引入 node:fs/promises。
```

## 9. 当前还不能做什么

虽然 provider 已经完成，但当前还没有真实连 Supabase。

因此当前还不能说：

```text
手机上传已经真实写入 Supabase Storage。
```

只有配置真实 Supabase 环境变量、创建 bucket、部署到 Vercel 后，才能做真实云端 E2E。

## 10. 下一步

下一步建议进入：

```text
M1.23C：Supabase Postgres 迁移验证。
```

M1.23C 的目标是：

```text
在不 drop table、不删除数据、不重做 migration 的前提下，让当前 schema 能在空 Supabase Postgres 上跑通。
```

M1.23C 完成后，再进入：

```text
M1.23D：Vercel 部署。
```
