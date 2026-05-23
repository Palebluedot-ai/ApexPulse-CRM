# hashkey-otc-crm-v1

V0 的 PWA-first 重写。不依赖 Discord，Web 主入口，serverless 部署。

V0 仓库（仍在生产运行）：[jsui1998-cpu/hashkey-otc-crm](https://github.com/jsui1998-cpu/hashkey-otc-crm)

## 当前状态

设计阶段。还没写代码。

## 阅读顺序

1. **[DESIGN.md](./DESIGN.md)** — 完整设计文档（架构、技术栈、范围、anti-goals、时间预估）

## 下一步

在写任何代码之前，必须完成 [DESIGN.md §7](./DESIGN.md#7-必须在写代码之前验证的-3-件事) 的 3 个前置验证：

1. HashKey 合规对境外 vision API 的政策
2. 视觉 LLM 中文 OCR 准确性实测（5 张真实截图）
3. iOS PWA Share Target 实测（自己手机上验流程接受度）
