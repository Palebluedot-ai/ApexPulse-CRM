# 2026-05-26 M1.6 UI/UX Dogfood Polish 系统日志

## 1. 本轮背景

Chao 确认可以进入夜间长跑模式。

本轮只做低风险任务。

明确不做：

- migration
- 真实 API key
- 真实客户数据
- OCR
- Vision API
- 权限系统
- 云部署
- 客户分层最终规则

## 2. 已落地内容

新增全局导航组件。

导航包含：

- 首页
- 录入
- 待确认
- 客户
- 任务

导航能力：

- 当前页面高亮
- 移动端横向滚动
- 桌面端右侧展示
- 顶部显示 `OTC CRM`
- 顶部显示 `local-first dogfood`

## 3. 已验证内容

已运行：

```bash
pnpm check
pnpm build
```

验证结果：

- 全量 lint 通过
- 全量 typecheck 通过
- 全量测试通过
- 生产构建通过

本地生产预览验证：

```text
GET /customers
```

页面已确认出现：

- OTC CRM
- local-first dogfood
- 首页
- 录入
- 待确认
- 客户
- 任务

## 4. 当前结论

M1.6 基础版已经成立。

明天 dogfood 时，Chao 可以从任意页面更容易跳转。

下一步继续 M1.7：Review 连续处理体验增强。
