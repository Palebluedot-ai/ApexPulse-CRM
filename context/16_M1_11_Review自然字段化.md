# M1.11 Review 自然字段化

## 1. 文档目的

这份文档记录 M1.11 的产品目标、实现边界和验证结果。

这份文档是自包含的。读这份文档不需要先读其他文档。

## 2. 当前问题

M1.10 已经把 Review 页面里的 JSON 输入框移除。

但 M1.10 之后，Review 页面仍然主要围绕“摘要确认”工作。

这还不够像真实 CRM。

真实使用时，Chao 需要确认的不只是摘要，而是几个可行动的业务字段：

- 客户名
- 公司
- 来源
- 需求
- 下一步
- 下次跟进时间

这些字段应该以普通人能理解的表单出现。

页面不应该让用户看到 JSON。

## 3. 本轮产品边界

本轮坚持下面边界：

- 不改数据库表结构
- 不做 migration
- 不接真实 AI / OCR / Vision API
- 不创建真实登录系统
- 不自动创建新客户
- 不自动改写客户分层规则
- 不展示 JSON

原因：

当前目标是把 Review 页从“开发可用”推进到“业务可用”。

数据库和自动化规则可以以后再扩展。

现在最重要的是让用户确认字段时不需要理解技术结构。

## 4. 本轮实现

本轮新增自然字段映射 helper。

系统会从已有结构化字段中识别下面字段：

- `customerName`
- `companyName`
- `sourceTag`
- `needSummary`
- `nextAction`
- `nextFollowupAt`

系统也兼容一些旧字段名。

例如：

- `name` 可以映射到 `customerName`
- `company` 可以映射到 `companyName`
- `referralSourceTag` 可以映射到 `sourceTag`
- `requirement` 可以映射到 `needSummary`
- `nextStep` 可以映射到 `nextAction`
- `nextFollowupDate` 可以映射到 `nextFollowupAt`

Review 页面现在展示自然字段表单。

用户可以直接编辑：

- 摘要
- 绑定客户
- 客户名
- 公司
- 来源
- 需求
- 下一步
- 下次跟进时间
- 跟进状态

用户可以选择：

- 只保存字段，仍然留在待确认队列
- 确认入库
- 跳过

## 5. 数据处理原则

自然字段最终仍然写回 `extractedFieldsJson`。

这样当前不需要改数据库。

空字段不会强行写入。

未展示的底层字段会保留。

这可以避免用户编辑自然字段时，系统误删以后可能有用的信息。

## 6. 当前刻意不做

本轮不自动创建新客户。

当用户选择“新客户 / 暂不匹配现有客户”时，系统仍然只是确认事件，不会自动生成客户档案。

原因：

自动创建新客户会涉及去重、匹配、合并和 owner 规则。

这些属于后续独立设计，不应该悄悄混进 M1.11。

本轮不根据“下次跟进时间”自动生成任务。

原因：

任务生成规则需要单独确认。

当前先把字段保存下来，让后续任务自动化有数据基础。

## 7. 验证结果

已新增测试覆盖：

- 从旧字段名和标准字段名生成自然字段
- 自然字段写回结构化字段时保留未知字段
- 空自然字段不会被写入
- Review 页面模型携带自然字段

已运行：

```bash
pnpm test src/lib/review-form.test.ts src/server/review/review-page-model.test.ts src/server/review/review-queue.test.ts
pnpm check
pnpm build
```

验证结果：

- 目标测试通过
- 全量 lint 通过
- 全量 typecheck 通过
- 全量测试通过
- 13 个测试文件通过
- 50 个测试通过
- 生产构建通过
- `/review` 页面 smoke test 通过

## 8. 当前结论

M1.11 基础版已经成立。

Review 页现在更接近普通用户可用的确认页面。

下一步建议进入 M1.12：图片真实上传。

M1.12 可以继续保持 local-first。

不需要马上上云。
