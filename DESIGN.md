# HashKey OTC CRM V1 — Design Doc

> **状态**: DRAFT
> **创建**: 2026-05-24
> **作者**: Chao
> **前作**: [jsui1998-cpu/hashkey-otc-crm (V0)](https://github.com/jsui1998-cpu/hashkey-otc-crm) — 仍在生产
> **本仓库定位**: V0 的完全重写。新栈、新架构、新代码、新仓库。V0 作为 reference implementation 保留运行。

---

## TL;DR (一段话讲清楚)

V1 是 V0 的 **PWA-first 重写**。核心架构变化只有一个：**Discord 不再是产品的必需组件**。V0 的"销售外接大脑"靠 Discord 当输入通道，导致 setup 复杂、无法分享给非 power user。V1 把入口收回到 PWA 自己：截图、拍照、拖拽、文字、（power user）Discord——全部写到同一个数据库。Discord bot 在 V1 代码里仍然存在但被列为"可选 power user 通道"，README 不文档化它。V0 的"灵魂"（LLM 抽取、客户去重、任务派生、Postgres schema）100% 复用，"皮肤"（Web UI）和"入口"（Discord）重写。

---

## 1. 为什么重写（两个动机，按重要性排序）

### 1.1 最重要的：要做一个产品，不是一个工作流

V0 的硬依赖是 Discord。把 V0 推荐给一个新人意味着：

- 创建 Discord application
- 生成 bot token
- 开启 Privileged Gateway Intents (Message Content Intent)
- 邀请 bot 到指定 server，包含 `bot` + `applications.commands` scopes
- 创建 `#inbox` channel
- 获取 channel ID（开发者模式 → 右键复制）
- 设 `INBOX_CHANNEL_ID` 环境变量

**30 分钟的 setup**。给同事推 = 摩擦巨大，给客户推 = 不可能。V0 不是产品，是"我和同事的工作流"。

要变成产品（即使只是给内部团队的产品），Discord 必须出局。**这是这次重写的根本动因。**

### 1.2 次要的：所有权 + 学习

V0 大部分代码是别人写的。Chao 要从 0 到 1 自己写一遍，原因：
- 真正理解每一个架构决定为什么是这样
- 拥有"我写的"级别的维护能力（不只是"读懂别人的"）
- 学习作为 Sales Director 兼新手 coder 的代码肌肉

这个动机不主导架构（架构由 1.1 决定），但它选择了"重写而非增量 refactor"。

### 1.3 为什么不走 V0 的 8 阶段 refactor roadmap

V0 的 `CODEBASE-MAP.md` 里已经写了一份 8 阶段 refactor roadmap（约 4-6 周）。**那份 roadmap 不能解决 1.1 的问题**——它把 Discord 越加越深（更好的 bot 错误处理、更好的 slash command），但不能让产品脱离 Discord。

因此选择重写而非 refactor。

---

## 2. V0 → V1 架构对比

### V0 (现状)

```
微信截图
   ↓ (用户手动 forward)
Discord #inbox
   ↓ (discord.js bot 监听)
HashKey OTC Bot (Node.js, discord.js)
   ↓ (vision LLM OCR + extraction)
Postgres + pgvector
   ↑
Web Dashboard (bespoke Node HTTP, 2630 行单文件, 浏览器访问)

部署: 家里 Mac mini + Cloudflare Tunnel + Tailscale + R2 冷备
```

**问题**:
- Discord setup 摩擦巨大
- 用户跳两个 App（WeChat → Discord → 浏览器看 dashboard）
- Web dashboard 无 auth，仅靠 127.0.0.1 + Cloudflare Tunnel 防护
- bespoke HTTP server + 6 处 raw SQL，schema 改字段同步炸两端
- Mac mini 断电就死

### V1 (目标)

```
WeChat / 名片 / 文档
   ↓ (iOS/安卓 分享菜单 或 PWA 内直接拍照/上传)
CRM PWA (Next.js 15, 用户唯一接触面)
   ↓ (Server Action → vision LLM)
Postgres + pgvector (Supabase Singapore region)
   ↑
CRM PWA (同一个 App, 看 timeline + 提醒 + 搜索)

[可选 power user 通道]
   Discord #inbox → discord.js bot (V0 代码复用) → 同一个 Supabase

部署: Vercel (Web/API) + Supabase (DB/Storage/Auth) + (可选) Fly.io (bot)
```

**改进**:
- 用户在一个 App 内完成所有事
- Magic link auth = 同事 onboard = 输入邮箱 + 点链接
- serverless = 不依赖任何家里设备
- Drizzle ORM 全程，无 raw SQL
- iOS PWA 安装到主屏 = "App 感"

---

## 3. 技术栈

| 层 | 技术 | 选择理由 |
|---|---|---|
| 前端 | **Next.js 15 (App Router)** | 最成熟 fullstack TS 框架，AI 工具支持最完整 |
| PWA | **Serwist** | 现代版 next-pwa（next-pwa 已停维护） |
| 样式 | **Tailwind CSS** | 主流 + AI 工具最熟 |
| 组件库 | **shadcn/ui** | 拷代码进项目，质量高，可定制 |
| 后端 | **Next.js API Routes + Server Actions** | 跟前端同一进程，无跨语言 contract |
| ORM | **Drizzle** | 跟 V0 同栈，schema 可直接 port |
| 数据库 | **Supabase Postgres (Singapore)** | 距离 HK 50ms，pgvector 支持 |
| 文件存储 | **Supabase Storage** | 替代 V0 `data/attachments/` 本地目录 |
| 认证 | **Supabase Auth (magic link)** | 5 行配好，无密码处理 |
| LLM | **tokenrouter (跟 V0)** | 多提供商路由，默认 `gpt-4o-mini` 文本 + `gpt-4o` 视觉 |
| LLM 结构化输出 | **OpenAI structured outputs (json_schema)** | 替代 V0 的 9 步 JSON 修复 hack |
| 推送 | **Web Push API + service worker** | 替代 Discord push，iOS 16.4+ 支持 |
| 部署 | **Vercel (Web) + Fly.io 免费 tier (bot)** | git push 自动部署 |
| 包管理 | **pnpm 10.x** (跟 V0) | 一致 |
| Node | **22** (跟 V0) | 一致 |
| CI | **GitHub Actions + Lefthook pre-commit** (跟 V0) | 一致 |

**关于 Python**：Chao 的全局 CLAUDE.md 写"Python preferred"，但本项目里 Chao 明确说"不要 Python，关键要用最成熟的"。本项目以这个 in-session 决定为准。

---

## 4. 数据模型 (从 V0 复用)

V0 的 schema 已经经过 8+ 周生产验证，**直接复用**，不重新设计。

核心表：

```
parties (
  id, display_name,
  handles jsonb,         -- {wechat_remark, wechat_name, telegram, phone, ...}
  org,                   -- 公司/机构
  emoji_status,          -- 🌱新认识 / 🔥活跃 / 🟡跟进 / 💤沉睡 / ✅成单 / ❌流失
  tags[],                -- ⭐VIP ⚠风险 🤝介绍人 💰大额 🔄今日待跟进
  profile_md,            -- LLM 持续 patch 的客户画像
  owner_id (V2 预留),
  created_at
)

events (
  id, party_id (nullable, 三级 fallback),
  source,                -- pwa / discord / api
  raw_content,           -- 原始文字（必须保留）
  attachments,           -- Supabase Storage URL 列表
  ocr_text,
  extracted_fields jsonb, -- LLM 抽取（含 _awaiting_* markers）
  status,
  created_at, occurred_at
)

tasks (
  id, party_id, event_id,
  description,
  due_at,
  status,                -- pending / done / snoozed
  created_at
)
```

**V0 死表 (V1 不带入)**:
- `relationships` (V0 业务代码完全不用)
- `referral_accounts` (V0 业务代码完全不用)

**V0 死列 (V1 不带入)**:
- `events.embedding vector(768)` (V0 全程不读不写)

---

## 5. 复用 V0 的"灵魂"

V1 不重新发明这些东西，从 V0 移植：

1. **LLM extraction prompts** — V0 system prompt（86 行）已修补 16 个失败模式，直接拿
2. **Party matching threshold = 0.4** — V0 经过生产数据校准
3. **WeChat segment gap = 14 天** — V0 经过用户行为校准
4. **Follow-up 阈值**：14 天未跟 + 30 天沉睡
5. **Task derivation 关键词模板** — V0 `tasks/derive.ts:135-148`
6. **客户分组三级 fallback**：party_id → extracted name → unknown
7. **原始依据保留原则**：原文 + 原图永不被 OCR 替换

但移植时一并修复 V0 的已知 bug（详见 V0 `CODEBASE-MAP.md`）：

- `/today` partyName 永远 null
- `new_party` 路径覆盖整个 extracted_fields
- `isImageAttachment` 不识别 HEIC/AVIF (iPhone 截图 miss)
- 时间解析半残（"中午1点" 被解析成 01:00）

---

## 6. UX 关键决定

1. **PWA 优先，原生 App 不做**。iOS PWA 装到主屏 = "App 感"足够。
2. **iOS Share Target 不能完整支持**（Apple 限制）。iOS 流程是 4 步：截图 → 切到 PWA → 上传按钮 → 选最近图。**接受这个限制**，因为所有步骤在一个 App 内，心理负担远小于 V0 的"WeChat → Discord → 浏览器"3 个 App 切换。
3. **AI 抽取永远 human-in-the-loop**。vision LLM 提取 → PWA 显示 confirm 表单（可编辑字段）→ 用户保存。**永不自动入库**。延续 V0 `_awaiting_*` markers 理念。
4. **Auth 必做**。V0 无 auth 是历史遗留。V1 magic link via Supabase Auth，进公网必备。
5. **原始证据保留**。所有原始截图 + 原始文字保留 30 天以上（可配），UI 永远可以"查看原图原文"。
6. **Web Push 提醒**。替代 V0 Discord 推送。需 service worker + VAPID keys。

---

## 7. 必须在写代码之前验证的 3 件事

这 3 件事决定 V1 架构 60% 的细节。**没拿到答案不写代码。**

### 7.1 合规问题（最关键）

**问 HashKey 合规 / IT**：

> 我在做内部 CRM，会用境外 AI（Claude / OpenAI 视觉模型）读客户微信对话截图。咱们规则是什么？

可能的答案与对应的架构后果：

| 合规答复 | 架构后果 |
|---|---|
| ✅ 完全可以用境外 vision API | 默认架构成立（Anthropic / OpenAI / 由 tokenrouter 选） |
| ⚠️ 仅在 HK / 大中华区机房 | 切到 Azure OpenAI HK region 或 Cloudflare Workers AI |
| ❌ 不允许境外 AI 读客户数据 | 自托管 Qwen2-VL 或 DeepSeek-VL，部署在 HK 机房；Supabase 改自托管 Postgres |

**必须拿到书面或 Slack 文字答复。** 这是 V1 不能省略的前置。

### 7.2 视觉 LLM 准确性实测

拿 5 张真实微信对话截图（脱敏即可）丢给 Claude 3.5 Sonnet 视觉能力（或 GPT-4o），手动验证：

- 中文姓名识别（"王总" 不要变 "王恩"）
- 时间识别（"周三下午" 不要变 "周二下午"）
- 金额识别（"200w USDT" 解析准确）
- 上下文理解（"加仓" / "限制问询" / "开户")

**如果准确率 < 95%**：V1 架构要比 V0 多一个"低置信度 → 二次确认"逻辑。
**如果准确率 ≥ 95%**：V0 的 `_awaiting_*` markers 模式直接复用。

### 7.3 iOS PWA Share 实测

在自己 iPhone 上：

1. Safari 装 Twitter/X 的 PWA 到主屏
2. 截一张微信对话图
3. 相册里点这张图 → "分享"
4. **观察**：X 的 PWA 出现在分享菜单里吗？

**预测**：不会出现（Apple 限制）。

**那么 V1 的实际流程**：
- 截图微信
- 切到 CRM PWA 桌面图标
- PWA 内点"上传"
- 从"最近"里选刚截的图
- 看 AI 提取结果，确认

**评估这 4 步对你 / 同事的接受度**。如果不接受，V1 必须考虑原生 iOS App（Capacitor 包装 PWA 或 Expo）。如果接受，V1 PWA 路线确定。

---

## 8. 实施路径

**Approach A: 全新仓库，V0 继续运行**（当前选择）

- 新仓库 = 本仓库
- V0 在 Mac mini 继续跑，作为 Chao 个人 backup
- V1 在 Vercel + Supabase
- 6-10 周达到 V0 功能 parity，之后 V0 退役
- 风险低：V0 是 fallback
- 学习价值高：每行代码都是 Chao 写的

不选 B（在 V0 monorepo 内 in-place 演进）：违反"从 0 到 1"初心 + 触碰 V0 = 风险。
不选 C（fork V0 后剪裁）：继承 V0 git 历史 + PII 包袱。

---

## 9. 成功标准（什么时候可以宣布 V1）

- [ ] Chao 给同事一个 URL + magic link，同事不需要任何指导就能完整记录一个客户互动
- [ ] Chao 对新客户停用 V0，改用 V1
- [ ] V0 历史客户数据全部迁移到 V1
- [ ] V1 完全不依赖 Mac mini（Mac mini 断电不影响 V1）
- [ ] Web Push 提醒至少触发过一次沉睡 follow-up
- [ ] iOS PWA "添加到主屏" 流程在 Chao 自己手机上跑通

---

## 10. 数据迁移

**V0 → V1 数据迁移路径**：

1. V0 `pg_dump --format=custom`（V0 README 已有流程）
2. 在 Supabase Postgres 创建空 DB，启用 pgvector
3. 跑 V1 的 Drizzle migrations（schema 跟 V0 一致 + 删除死表/死列）
4. `pg_restore --data-only` V0 dump
5. 附件：V0 `data/attachments/` → Supabase Storage（写个一次性脚本）
6. 验证：V1 PWA 打开后能看到所有 V0 客户和 timeline

**不做的事**：
- 不把 V0 客户聊天记录 PDF 带进 V1 git 历史
- 不带 V0 的 `_bmad/` 实验残留
- 不带 V0 的 `参考聊天内容.pdf`（含真实 PII）

---

## 11. 部署 / 分发计划

| 组件 | 部署位置 | 触发方式 | 备注 |
|---|---|---|---|
| PWA + API | Vercel | `git push origin main` 自动部署 | hobby plan 对个人项目免费 |
| Database | Supabase Singapore | 创建一次 + Drizzle migrations | 免费 tier 500MB |
| 附件存储 | Supabase Storage | 一同创建 | 免费 1GB |
| Auth | Supabase Auth | 一同创建 | 包含 magic link |
| Discord bot (可选) | Fly.io 免费 tier | 单独 `fly deploy` | 不在 README 文档化 |

**自定义域名**: 推荐买一个，Vercel 一键 attach。让产品"feel real"。

---

## 12. Open Questions（决定但未答的事）

1. **合规答复**：见 §7.1，blocking
2. **域名**：买不买、买什么
3. **Discord bot 在 V1 里是否完全移植**：当前倾向"代码保留但 README 不推"。是否值得花时间写文档自己用？
4. **同事的参与度**：V0 是两人协作（见 V0 AGENTS.md），V1 是否同样？如果是，V1 也需要 AGENTS.md 从 day 1
5. **Telegram 入口**：V1.5 是否要加 Telegram bot 作为更轻的 IM 入口？暂时不做
6. **V0 退役时间**：达到 parity 后多久关停 V0？建议 V0 再继续跑 1 个月作为 fallback

---

## 13. Anti-Goals（明确不做的事）

- ❌ 不做原生 iOS / Android App（PWA 足够）
- ❌ 不做上架 App Store / Google Play（PWA 足够，内部工具不需要）
- ❌ 不做多租户（Chao + HashKey 团队内部用，V1 单租户）
- ❌ 不做 RBAC / 上下级权限（V2 才做）
- ❌ 不做对外销售功能（V1 是内部工具）
- ❌ 不做集成飞书 / 企业微信 API（不可能集成微信群对话；飞书集成成本高）
- ❌ 不在 V1 重新设计 schema（直接复用 V0）

---

## 14. 时间预估

| 阶段 | 内容 | 周数 |
|---|---|---|
| 0 | 3 件前置验证（§7） | 0.5 周 |
| 1 | Next.js + Supabase 骨架 + auth | 1 周 |
| 2 | PWA 基础（manifest + service worker + 安装提示） | 0.5 周 |
| 3 | 客户列表 + 详情 + timeline 页面 | 1.5 周 |
| 4 | 上传 + vision LLM 抽取 + confirm UI | 2 周 |
| 5 | 任务 + 提醒 + Web Push | 1 周 |
| 6 | 搜索 + 起草回复 + /today 替代页 | 1 周 |
| 7 | V0 数据迁移 + 测试 + 调整 | 1 周 |
| 8 | Discord bot 移植 (optional) | 0.5 周 |
| **合计** | | **~8-9 周** |

按 Chao 的进度（Sales Director 本职 + Claude Code 辅助），合理估算 **8-12 周**。

---

## 附录 A: V0 文件参考索引

V1 实施时常需要参考 V0。关键文件：

| V0 路径 | 用途 |
|---|---|
| `packages/shared/src/llm/extraction.ts` | LLM 抽取 prompt + 9 步后处理 |
| `packages/shared/src/llm/vision.ts` | 视觉模型调用 |
| `packages/shared/src/party-matching/` | 客户去重（threshold 0.4） |
| `packages/shared/src/tasks/derive.ts` | 任务派生关键词模板 |
| `packages/shared/src/wechat/timeline.ts` | WeChat 时间戳解析 + 14 天 segment |
| `packages/shared/src/db/schema.ts` | Drizzle schema（V1 直接参考） |
| `packages/shared/src/db/migrations/` | Drizzle migrations 历史 |
| `packages/web/src/server.ts` (2630 行) | Web UI 模板（V1 从这里参考 UI patterns，不复用代码） |
| `packages/bot/src/handlers/` | Discord 消息处理（V1 移植成 Server Action） |
| `CODEBASE-MAP.md` | V0 全部架构 + 风险清单 |

**V0 文件 V1 绝对不带入**:
- `参考聊天内容.pdf` (真实 PII)
- `brainstorming/` (110+ 被淘汰想法)
- `_bmad/` (实验残留)
- `data/attachments/` (生产隐私数据，单独迁移到 Supabase Storage)

---

## 附录 B: 决策溯源

这份文档是 2026-05-24 一次 GStack `/office-hours` session 的产物。session 中的关键决定：

| 决定 | 选择 | 备选 |
|---|---|---|
| 重写还是 refactor | **重写**（greenfield） | V0 8 阶段 roadmap |
| V1 范围 | **同 V0 + 加 PWA UI** | 也加 auth/多租户 |
| 技术栈 | **α: 全 TypeScript / Next.js** | β: Python+Next / γ: 全 Python+HTMX / δ: Hono |
| Discord 是否丢掉 | **保留为可选 power user 通道**，README 不推 | 完全丢掉 / Telegram 替换 |
| 部署模式 | **Vercel + Supabase serverless** | 继续 Mac mini 自托管 |

驱动决定的根本约束：
- "**最成熟**"（Chao 明确说的，胜过他全局 CLAUDE.md 的 "Python preferred"）
- "**不依赖 Discord 的产品形态**"（Chao 重写的核心原因）
- "**从 0 到 1 自己写**"（Chao 的学习目标）

---

**下一步**：跑 §7 的 3 个前置验证 → 拿到答案 → 跑 `/plan-eng-review` 或 `/autoplan` 锁定架构 → 开始 §14 阶段 1 的代码工作。
