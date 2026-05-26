# 2026-05-26 M1.9 README / Onboarding 系统日志

## 1. 本轮背景

夜间长跑模式继续到 M1.9。

本轮只做文档和 onboarding。

旧 README 停留在工程骨架和 API 阶段。

当前项目已经进入 M1 local dogfood 阶段。

## 2. 已落地内容

更新 `README.md`。

README 当前覆盖：

- 当前阶段
- 第一条产品闭环
- 本地启动
- 主要页面
- Dogfood 指南
- 验证命令
- 数据库命令
- 当前已有能力
- 当前刻意不做的能力
- 不可动摇的产品原则
- context 目录
- system log 目录

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

## 4. 当前结论

M1.9 基础版已经成立。

夜间长跑低风险任务已经完成一轮。

明早最好的动作不是继续加功能，而是按 Dogfood 指南实际跑一遍，并记录哪里怪。
