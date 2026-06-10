# ApexPulse CRM - Project Rules

## Product Direction

- This is a PWA-first side project for Chao's OTC sales follow-up workflow.
- The first user is Chao only.
- Future team use is allowed, but V1 must not start from complex team permissions.
- The first core loop is: capture evidence -> review extracted result -> write customer timeline -> refresh follow-up state -> create or update tasks.

## Document Rules

- Every product document must be self-contained.
- Do not write "see another document", "read X first", or any cross-document dependency as a requirement.
- If the same decision is important in multiple documents, repeat the decision in plain language.
- If a requirement is uncertain, mark it as non-blocking or blocking directly in that document.

## Decision Rules

- Stop and ask Chao before changing any product boundary.
- Product-boundary changes include: person-first to company-first, review-first to automatic ingest, single-user to team-first, PWA-first to another primary channel, or local-first to cloud-only.
- Do not silently decide lead segmentation rules, permission details, or final cloud architecture.

## Engineering Rules

- Use pnpm for Node package management.
- Use uv for Python package management. Do not use pip or pip3.
- Use TypeScript for app code.
- Use tests first for business rules: follow-up status refresh, task generation, review status transitions, and extraction normalization.
- Configuration and generated framework boilerplate do not require mechanical TDD, but must still pass lint, typecheck, and tests before being called complete.

## Team Collaboration Rules

- Before modifying code, docs, database, deployment, or Git history, every human contributor and AI agent must read `CONTRIBUTING.md`.
- It is forbidden to work in this repository without reading `CONTRIBUTING.md`.
- It is forbidden to skip the collaboration rules because a task looks small.
- It is forbidden to commit directly to `main` for new work. Use a branch and PR unless Chao explicitly says otherwise.
- It is forbidden to merge, revert, reset, or force-push shared history without understanding the current branch state and Chao's intent.
- Chao as Administrator may use emergency bypass, but collaborators and AI agents must not treat that as permission to bypass PR review.
- This project is entering first-time two-person collaboration.
- Before starting work, run `git status -sb` and `git pull --ff-only`.
- Do not use `git reset --hard`, `git clean -fdx`, or `git push --force` unless Chao explicitly approves.
- Do not submit `.env`, `.env.local`, `.env.*.local`, `data/`, real screenshots, API keys, Supabase keys, Vercel tokens, or database connection strings.
- Do not change product boundaries without asking Chao.
- Do not drop tables, reset databases, delete real data, remove migrations, or recreate migrations without asking Chao.
- Avoid two people editing the same files at the same time.
- If a task touches business rules, write tests first.
- Before saying work is complete, run `pnpm check`; if the task touches deployment, Next.js routes, or server/client boundaries, also run `pnpm build`.
- New product or collaboration docs must be self-contained.
- The first team collaboration SOP is `context/32_首次团队协作规则.md`.

## Communication Rules

- Explain key technical choices briefly in Chinese.
- Avoid corporate jargon.
- Prefer concrete tradeoffs over vague reassurance.

## Snapshot Status (updated on 2026-06-02)

- 全面 review 完成：M1.23D 已落地，进入 M1.23E（真实云端部署 + C1 手机真实使用）。
- 新建核心路径图：context/31_M1_23E_首次云端部署与C1验收路径.md（自包含，含 full picture、TDD 步骤、Chao 确认）。
- 发现并纳入路径：vision-extract 不支持 supabase-images/（必须在 E 中 TDD 修复）。
- Chao 确认：立即真实部署、vision 云端支持优先、C1 标准=checklist+“愿意继续每天用”、暂不加 PWA icons、聚焦部署与基础闭环。
- Snapshot 文件：docs/snapshots/2026-06-02-230914.md（按 snapshot skill 结构，中文）。
- system log：context/system_logs/2026-06-02_M1_23E_Review与路径图.md。
- 00_文档总览.md 已更新指向 31_ 作为最新。
- 下一步：按 31_ 执行 Step 0 基线 + Step 1 TDD 修 vision（先测试后代码），所有变更必须 pnpm check + build 通过。
- 参考：docs/snapshots/2026-06-02-230914.md + context/31_ + context/00_文档总览.md。
- 规则不变：任何产品边界变更必须停下问 Chao；TDD 铁律保留于业务规则。
