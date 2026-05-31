# M1.23 部署路线 Office Hours

## 1. 文档目的

这份文档用于确定 HashKey OTC CRM V1 的中期个人使用部署路线。

这份文档是自包含文档。

阅读这份文档不需要依赖其他文档。

当前问题不是“本地服务能不能修好”。

当前问题是：

```text
Chao 需要一个手机随时能访问、长期能使用、后续能扩展的真实测试环境。
```

这份文档只做部署路线判断，不写具体代码实现。

## 2. 当前背景

当前产品已经具备个人 CRM 的核心闭环：

- 用户可以登录
- 用户可以上传聊天截图
- 系统可以保留原始图片证据
- 系统可以调用外部视觉模型提取字段
- AI 结果不会自动入库
- 用户可以在 Review 页面人工确认
- 确认后可以创建或更新客户
- 确认后可以更新客户最新沟通摘要
- 确认后可以生成 follow-up 任务
- 用户可以查看客户详情和任务
- 用户可以查看 weekly report

当前阻塞点是手机真实使用：

- 手机和 Mac 同 Wi-Fi 时，理论上可以访问 Mac 的 Network URL
- 但 Chao 的手机和 Mac 都可能长期运行 VPN
- VPN 可能阻断同一 Wi-Fi 下的设备互访
- 所以继续依赖 `192.168.x.x:3000` 不稳定

因此，当前需要一个公网 HTTPS 地址。

## 3. 目标

M1.23 的目标是：

```text
让 Chao 可以用手机通过固定 HTTPS 域名访问 CRM，并跑通真实截图端到端闭环。
```

这个目标必须满足三点：

1. 开发更简单。
2. 测试更容易。
3. 以后更容易扩展。

## 4. 候选路线

### 4.1 路线 A：Mac mini 自部署 + Cloudflare Tunnel

做法：

- Mac mini 长期运行 Next.js app
- Mac mini 长期运行 Postgres
- 图片存在 Mac mini 本地硬盘
- Cloudflare Tunnel 提供公网 HTTPS 入口
- 域名通过 Cloudflare 指向 Tunnel

优点：

- 数据都在自己机器上
- 不需要 Supabase 数据库
- 不需要 Vercel 部署
- 对本地开发模型改动较少

缺点：

- Mac mini 需要长期在线
- 断电、重启、网络变化都会影响访问
- 备份需要自己做
- 日志、监控、恢复都需要自己管
- 未来团队使用时运维压力会变大

适合场景：

```text
适合“个人本地服务器爱好者路线”，不适合作为最快上线路线。
```

### 4.2 路线 B：Vercel + Supabase + Cloudflare 域名

做法：

- Vercel 运行 Next.js 应用
- Supabase Postgres 存结构化数据
- Supabase Storage 存截图附件
- Cloudflare 管理域名 DNS
- 手机通过正式 HTTPS 域名访问

优点：

- 手机不依赖同一 Wi-Fi
- VPN 不影响访问
- HTTPS 默认可用
- Vercel 对 Next.js 支持最好
- Supabase 直接提供 Postgres 和文件存储
- 后续团队账号、备份、迁移更自然
- 部署后就是接近真实产品的环境

缺点：

- 需要配置 Vercel、Supabase、Cloudflare 三套服务
- 附件不能继续只写本地 `data/attachments/`
- 需要把存储层做成 local / Supabase 两种实现
- 需要管理生产环境变量

适合场景：

```text
适合当前项目的中期个人使用路线，也是未来团队扩展最顺的路线。
```

### 4.3 路线 C：Supabase 全家桶

做法：

- Supabase Postgres
- Supabase Storage
- Supabase Auth
- Next.js 仍然可以部署在 Vercel 或其他平台

优点：

- 登录、数据库、文件存储可以集中在 Supabase
- 长期权限模型更完整
- 未来团队用户会比较自然

缺点：

- 当前已经有本地登录和业务 session
- 现在立刻切 Supabase Auth 会增加变量
- 需要重新梳理登录、cookie、用户表、权限关系
- 可能让 M1.23 从“部署上线”漂移成“重构登录”

适合场景：

```text
适合 M2 或 M3 之后再考虑，不适合作为 M1.23 第一刀。
```

## 5. 推荐路线

推荐选择：

```text
Vercel + Supabase Postgres + Supabase Storage + Cloudflare 域名
```

这条路线的判断是：

- Vercel 负责运行应用
- Supabase 负责数据和截图
- Cloudflare 负责域名
- Mac 本地继续负责开发

不要再把主线切回 Mac mini。

Mac mini 可以作为未来备份、自托管实验或公司服务器迁移的参考，但不要作为当前主线。

## 6. 为什么这条路线开发更简单

开发更简单的原因：

- 当前项目已经是 Next.js，Vercel 部署路径最短
- 当前数据库已经是 Postgres，Supabase Postgres 不需要换数据库思路
- 当前附件已经有“上传后保存路径”的概念，只需要把保存目标从本地文件系统抽象成 storage provider
- 本地开发仍然可以继续用 Docker Postgres 和 local file storage
- 云端只需要换环境变量，不需要换业务代码

需要新增的工程抽象：

```text
Storage Provider
```

第一版只需要两个实现：

- `local`：本地开发时保存到 `data/attachments/`
- `supabase`：云端部署时保存到 Supabase Storage

不建议第一版做三种以上存储。

## 7. 为什么这条路线测试更容易

测试更容易的原因：

- 手机可以直接打开 HTTPS 域名
- 不需要同 Wi-Fi
- 不需要关闭 VPN
- 不需要记住 `192.168.x.x`
- Vercel 每次 push 后可以自动生成可访问环境
- staging 环境可以专门用于真实截图测试

建议测试分层：

### 7.1 本地测试

本地测试目标：

```text
保证业务规则正确。
```

本地必须继续跑：

```bash
pnpm check
pnpm build
```

本地测试不依赖真实云服务。

### 7.2 Staging 测试

Staging 测试目标：

```text
保证手机真实闭环可用。
```

Staging 必须验证：

- 手机能打开域名
- 手机能登录
- 手机能上传真实微信截图
- 截图能进入 Supabase Storage
- 事件能进入 Supabase Postgres
- AI 能提取字段
- Review 能人工确认
- 确认后能更新客户
- 确认后能生成任务
- weekly report 能看到结果

### 7.3 生产前检查

生产前检查目标：

```text
避免把测试数据、错误 key、错误域名带到长期环境。
```

第一版可以先只有 staging。

等 Chao 真实用 1 到 2 天后，再决定是否区分 production。

## 8. 为什么这条路线更容易扩展

这条路线更容易扩展的原因：

- Supabase Postgres 后续可以承载多人数据
- Supabase Storage 后续可以承载更多截图和附件
- Vercel 后续可以处理固定域名、部署预览和回滚
- Cloudflare 后续可以继续管理域名、DNS 和基础访问控制
- 如果未来要迁回公司服务器，Postgres schema 和 Storage 抽象仍然可迁移

未来扩展路径：

```text
个人 staging -> 个人正式使用 -> 小团队试用 -> Leader / 下级权限 -> 公司服务器或更正式云环境
```

这条路线不会锁死未来。

## 9. 不建议现在做的事

M1.23 不建议做：

- 不建议立刻接 Supabase Auth
- 不建议立刻做团队权限
- 不建议立刻做多租户
- 不建议立刻做客户复杂合并
- 不建议立刻做自动入库
- 不建议立刻把 Mac mini 作为主线部署
- 不建议同时支持 Vercel、Mac mini、AWS 三条生产路线

原因：

```text
当前最重要的是让 Chao 能稳定从手机录入真实 case。
```

过早把部署做成多路线，会拖慢主闭环。

## 10. M1.23 开发拆解

### 10.1 M1.23A 环境变量整理

目标：

- 明确本地和云端需要哪些环境变量
- 不把真实 key 写入 Git
- 让 Vercel 可以通过环境变量运行

需要整理的变量：

- `DATABASE_URL`
- `AUTH_SESSION_SECRET`
- `VISION_API_PROVIDER`
- `VISION_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`
- `APP_BASE_URL`

验收：

- `.env.example` 或文档说明完整
- `.env.local` 不进入 Git
- Vercel 需要的变量清楚列出

### 10.2 M1.23B Storage Provider 抽象

目标：

- 本地继续存 `data/attachments/`
- 云端存 Supabase Storage
- 上传业务不关心底层存储

测试要求：

- local provider 能返回附件引用
- supabase provider 能被 mock 测试
- 上传失败时不会创建错误确认状态

### 10.3 M1.23C Supabase Postgres 迁移验证

目标：

- 把当前 schema 迁到 Supabase Postgres
- 不 drop 表
- 不删除数据
- 不重做 migration

验收：

- migration 可以在空 Supabase 数据库上跑通
- seed 可以创建默认用户
- Vercel 环境可以连接数据库

### 10.4 M1.23D Vercel 部署

目标：

- GitHub push 后 Vercel 可以部署
- Vercel 环境变量配置完整
- 部署后的 URL 可以打开登录页

验收：

- Vercel build 通过
- 登录页可访问
- 登录成功后进入首页
- 手机可以访问 HTTPS URL

### 10.5 M1.23E 自定义域名

目标：

- 用 Cloudflare 管理域名 DNS
- 域名指向 Vercel
- 手机用固定域名访问

验收：

- 域名 HTTPS 正常
- 登录 cookie 正常
- 上传截图正常

### 10.6 M1.23F 手机真实 E2E

目标：

```text
手机固定域名 -> 登录 -> 上传真实截图 -> AI 提取 -> Review -> 入库 -> 任务 -> Report
```

验收：

- 至少 3 张真实微信截图完整跑通
- 至少 1 条新客户被创建
- 至少 1 条已有客户被更新
- 至少 1 条 follow-up task 被生成
- weekly report 能显示本周跟进记录

## 11. 成本判断

当前阶段预计可以从免费或低成本开始。

需要注意：

- Vercel 免费计划通常足够个人 staging 使用
- Supabase 免费计划通常足够早期个人测试使用
- Cloudflare DNS 通常不需要额外付费
- 外部视觉模型 API 会产生按量费用
- 真实截图变多后，Supabase Storage 和数据库可能需要升级

当前不建议因为成本担心而继续卡在本地访问。

原因：

```text
无法稳定手机测试，会比低成本云服务更贵。
```

这里的“贵”不是钱，而是反馈速度变慢。

## 12. 主要风险

### 12.1 真实截图进入云端

风险：

- 真实微信截图会上传到 Supabase Storage
- 真实截图会发送给外部视觉 API

当前判断：

- Chao 已确认这些真实截图可以外发到外部 API 测试
- 仍然不能把截图提交到 Git
- 仍然不能把 API key 提交到 Git

### 12.2 Vercel 文件系统不可持久化

风险：

- 云端不能继续依赖本地 `data/attachments/`
- Vercel 的运行环境不适合长期保存上传文件

解决：

```text
云端必须使用 Supabase Storage 存截图。
```

### 12.3 环境变量配置错误

风险：

- 本地能跑，云端不能跑
- 云端连接到错误数据库
- 云端缺少 AI key

解决：

- 做环境变量 checklist
- 启动时检查关键变量
- staging 先跑，不直接声明生产可用

### 12.4 登录安全仍是个人版

风险：

- 当前登录是个人版本地账号逻辑
- 还不是完整团队权限系统

当前判断：

- M1.23 可以继续用现有登录
- 不把 Supabase Auth 作为第一步
- 等团队权限进入 M2 时再重新设计 Auth

## 13. 推荐决策

推荐决策：

```text
从现在开始，部署主线确定为 Vercel + Supabase + Cloudflare。
```

具体解释：

- Vercel 是应用运行主线
- Supabase 是数据库和附件存储主线
- Cloudflare 是域名主线
- Mac mini 是本地开发和未来备用自托管，不是当前上线主线

这个决策不会砍掉 Mac mini。

Mac mini 只是从“当前上线主线”降级为：

```text
本地开发机、备份实验、未来自托管备选。
```

## 14. 下一步

M1.23A 已经完成：

```text
整理环境变量和云端部署 checklist。
```

已经新增：

- `.env.example` 云端变量模板
- `pnpm env:check`
- `pnpm env:check staging`
- `pnpm env:check production`
- M1.23A 自包含 checklist 文档

下一步应该进入：

```text
M1.23B：Storage Provider 抽象。
```

原因：

```text
只有完成 Storage Provider 后，Vercel 部署才不会卡在图片上传。
```

## 15. 外部资料

Vercel 环境变量：

```text
https://vercel.com/docs/projects/environment-variables
```

Supabase Storage：

```text
https://supabase.com/docs/guides/storage
```

Cloudflare Zero Trust / Tunnel：

```text
https://www.cloudflare.com/plans/zero-trust-services/
https://www.cloudflare.com/en-gb/products/tunnel/
```
