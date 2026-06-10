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
- Commits inside a feature branch do not require review one by one; review is required when merging the branch into `main`.
- Product branches should represent one verifiable user-value loop, not random file groups or long-running catch-all work.
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

## Snapshot Status (updated on 2026-06-11)

- 当前阶段：M1.23E 真实云端部署验证中，Vercel 项目已 import GitHub，生产主域名为 `https://apex-pulse-crm.vercel.app`。
- staging 环境变量检查已通过：`pnpm env:check staging` 缺失项为 none，warning 为 none。
- Supabase 数据库连接已通过：`pnpm db:check` 能连接到 `postgres/public`，`DATABASE_PREPARE=false` 已生效。
- 当前核心阻塞：Supabase 业务表尚未创建，缺少 `users`、`parties`、`events`、`attachments`、`tasks`。
- 代码健康：`pnpm check` 通过，32 个测试文件、156 个测试通过；`pnpm build` 在非沙盒环境通过。
- 新 snapshot 文件：`docs/snapshots/2026-06-11-003610.md`。
- 新 system log：`context/system_logs/2026-06-11_M1_23E_VercelSupabase环境验证.md`。
- 下一步必须先由 Chao 确认是否允许执行 `pnpm db:migrate`；这是写入 Supabase 数据库结构的动作，但不是 drop table，也不是删除数据。
- migration 后继续执行 `pnpm db:check`、`pnpm check`，再进入手机端 C1 闭环测试。
- 规则不变：不要提交真实 key、真实数据库密码、真实截图；任何 drop table、删除数据、重做 migration 都必须暂停确认。
