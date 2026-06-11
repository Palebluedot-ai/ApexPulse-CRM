# C1 Dogfood 首批修复清单

## 1. 背景

这份文档是自包含文档。

2026-06-11 下午,Chao 第一次用手机在生产环境(`https://apex-pulse-crm.vercel.app`)真实跑 C1 闭环,上传了 2 张真实微信截图。暴露出两类问题:

1. 核心闭环 bug:AI 自动提取永远转圈,字段不出现。
2. UI 专业度问题:字体、控件、滚动条多处不够精致。

本清单按优先级列出修复项,逐项打钩。

## 2. P0 核心闭环 bug(必须当天修)

### 2.1 云端图片自动提取静默失败

- [x] 根因定位(已完成):
  - 上传后自动提取走 `src/server/capture/auto-extract.ts` 的 `runExtraction()`。
  - 该函数仍然硬编码 `storageKey.startsWith("local-images/")` + 本地 `readFile`。
  - 云端 storageKey 是 `supabase-images/...`,直接 `return null` 静默跳过。
  - `aiExtractionSource` 永远不写入,Review 卡片永远显示"AI 正在提取"。
  - PR #21 只修了手动"立即提取"按钮走的 `/api/review/vision-extract` 路径,漏掉了这条自动路径。
- [x] 生产实测验证(已完成):
  - 手动调用 `/api/review/vision-extract` 提取卡住的 2 条记录,13-16 秒成功返回字段。
  - 证明 Vision API(tokenrouter + grok-4.3)从 Vercel 出口可达,Supabase 图片下载正常。
- [x] TDD 修复(PR #23 已合并):
  - 先在 `src/server/capture/auto-extract.test.ts` 加失败测试:`supabase-images/` storageKey 也应触发提取。
  - 改 `runExtraction()` 复用 `src/server/review/vision-extract-evidence.ts` 的 `readExtractableImageEvidence()`(与手动路径同一来源)。
  - 错误时不再静默 `return null`,console.error 留下日志便于 Vercel 排查。
- [x] `pnpm check` + `pnpm build` 通过。
- [ ] PR 合并后,手机再传 1 张新截图验证自动提取真正出字段。

### 2.2 提取等待文案与实际耗时不符(小)

- [x] 实测提取需要 13-16 秒,文案写"几秒后字段自动出现"会让人以为卡死。
- [x] 改成"AI 正在提取,约 20 秒内自动出现",降低误判(PR #23)。

## 2B. 第二批 P0(2026-06-11 下午手机实测新发现)

### 2B.1 同一张截图被建成两条待确认记录

- [x] 根因:手机上传慢,`submitImage` 没有上传中状态,按钮可以连点;Supabase 里同名同大小文件间隔 0.8 秒传了两次,实锤双击。
- [x] 客户端:上传期间禁用按钮 + 显示"上传中…" + in-flight 守卫。
- [x] 服务端:TDD 防重复——同一用户、同名同大小文件、2 分钟窗口内、仍在 pending_review,直接复用已有事件返回 `duplicated: true`,不再建新记录。

### 2B.2 网页卡顿 + 提取 16 秒过慢

- [x] 实测定位:本地直连 Vision API 只要 6-7 秒;生产 13-16 秒。差值在 Vercel 侧——函数默认跑在美东 iad1,数据库/存储在东京,每个请求 4-5 次跨太平洋往返(~170ms/次)。页面卡顿同因:每页 2-5 次 DB 查询都跨region。
- [x] 修复:`vercel.json` 把函数固定到 hnd1(东京),贴着 Supabase。
- [x] 实测发现图片压缩对延迟几乎无影响(470KB PNG 7.0s vs 59KB JPEG 6.7s),瓶颈是模型推理,不做压缩。
- [x] 同图三次提取结果不一致(客户名分别为 杨德智/CJ/CJ)→ 提取请求 temperature 固定为 0。

### 2B.3 提取质量观察(待真实使用积累后处理)

- [ ] 内部群聊截图会被误判出"客户"(把同事当客户名)。prompt 已有"不要把我方当客户"规则但覆盖不全。
- [ ] 建议:积累 5-10 张典型截图做 golden set,再迭代 prompt(加"识别为内部沟通时 customerName 留空 + not_a_lead"规则);也可在 tokenrouter 上换更快的 vision 模型对比质量(改 VISION_API_MODEL 环境变量即可,不用改代码)。

## 3. P1 UI 专业度修复(按页面)

设计原则(全站统一):

- 控件(输入框、下拉、按钮)统一高度 44px(min-h-11),同一行内宽度对齐。
- 禁止出现横向滚动条;放不下就缩字号或改布局,不靠 overflow-x-auto。
- 图例/辅助文字最小 13px,不再用 11px(text-xs)级别的说明字。
- 同一页面同一层级的卡片圆角、边框、阴影一致。

### 3.1 /customers 客户列表(本次重点)

- [ ] 标题行图例(该跟进/快到期/正常/没计划)字号从 text-xs 提到 13px,色点与文字垂直居中,与"客户"标题基线对齐。
- [ ] 搜索区三个控件(搜索框/排序下拉/搜索按钮)统一高度、统一圆角;手机上布局改为:第一行搜索框全宽,第二行排序下拉占满剩余宽度 + 搜索按钮固定宽,两行左右边缘对齐。
- [ ] 状态筛选 tab(全部/该跟进/快到期/正常/没计划)去掉 overflow-x-auto 横向滚动;5 个 tab 等分一行,缩小内边距和字号让其放得下,不再出现滑条。
- [ ] 空状态卡片与列表卡片样式统一。

### 3.2 /review 待确认

- [ ] 顶部"筛选"和"N 条待确认"chip 与下方卡片左边缘对齐,字号统一。
- [ ] 提取等待卡片文案改 20 秒(见 2.2)。
- [ ] 展开修改区表单字段间距与输入框高度统一。

### 3.3 / 首页(今日)

- [ ] 检查辅助说明文字字号,低于 13px 的提升。
- [ ] 卡片标题/正文层级统一(同 customers 设计原则)。

### 3.4 /tasks 任务

- [ ] 分组标题与任务卡片字号层级统一。
- [ ] 辅助文字(到期时间等)不低于 13px。

### 3.5 /reports/weekly 周报

- [ ] 大数字统计行在手机上不溢出、不出横向滚动。
- [ ] 表格/列表辅助文字字号统一。

### 3.6 /capture 录入

- [ ] 上传按钮、备注输入框与全站控件高度圆角统一。

## 4. 验证方式

- 每个 UI 改动用本地 dev + 390px 宽度截图自查。
- `pnpm check` 全过;UI 不要求 TDD,但不许带着 lint/type 错误合并。
- 合并部署后,Chao 手机实际过一遍对应页面。

## 5. 分支与 PR 拆分

```text
PR A: fix(capture): cloud auto-extract support  ← P0,先合
PR B: fix(ui): mobile polish pass (customers 优先,其余页面同批)  ← P1
```

按协作规则:从最新 main 拉分支,PR 说明改了什么、怎么验证、有无边界变化。
