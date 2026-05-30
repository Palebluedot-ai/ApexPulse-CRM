# HashKey OTC CRM V1

PWA-first personal CRM for OTC relationship follow-up.

This project starts as Chao's side project. V1 is not a HashKey internal compliance system. The current priority is proving one mobile-first, local-first working loop before adding cloud deployment or team permissions.

## Current Stage

M1 is now dogfoodable locally, and C1 is focused on mobile launch dogfood.

The app can run these page-level flows:

- Capture text notes and image evidence metadata.
- Upload real image evidence to local storage.
- Review pending records before they enter customer history.
- Run Vision API extraction from a pending image review item.
- Confirm, edit, or skip review items.
- Browse customers in a compact card dashboard.
- Open a customer detail action page with latest communication, Morning Brief, open tasks, and next step.
- Create, complete, and reopen follow-up tasks.
- View a weekly report and weekly to-do list.

## First Product Loop

```text
手机上传截图 -> 待确认 -> AI 提取 -> 人工确认 -> 客户详情 -> 任务 -> 周报回顾
```

This loop is intentionally review-first. Nothing is auto-ingested into customer history without confirmation.

## Start Locally

Start Postgres:

```bash
docker compose up -d postgres
```

Run migrations:

```bash
pnpm db:migrate:local
```

Seed demo data:

```bash
pnpm db:seed:local
```

Start the app:

```bash
pnpm dev
```

Open:

```text
http://localhost:3000
```

If port `3000` is occupied, Next.js may use another port. If it says another dev server is already running, first try opening `http://localhost:3000`. Only kill the old PID when you are sure it belongs to this project.

## Main Pages

```text
/          首页
/capture   新增录入
/review    待确认
/customers 客户列表
/tasks     跟进任务
/reports/weekly 周报
/dogfood/mobile 手机端测试入口
```

Customer detail pages use:

```text
/customers/:id
```

## Dogfood Guide

Use this document for the current mobile dogfood runbook:

```text
context/24_M1_22A_手机端Dogfood_Runbook.md
```

Use this checklist before calling C1 ready for real use:

```text
context/25_C1_上线Checklist.md
```

The older local manual test is:

```text
context/14_M1本地Dogfood指南.md
```

The recommended manual path is:

```text
首页 -> 新增录入 -> 待确认 -> 客户列表 -> 客户详情 -> 跟进任务
```

## Validation Commands

Run the full local quality gate:

```bash
pnpm check
```

Run production build:

```bash
pnpm build
```

These are the two commands to run before saying a milestone is complete.

## Database Commands

Generate a migration from schema changes:

```bash
pnpm db:generate
```

Run local migrations:

```bash
pnpm db:migrate:local
```

Seed local demo data:

```bash
pnpm db:seed:local
```

Do not casually drop tables, delete volumes, or redo migrations. Stop and review first.

## What Exists Today

Auth:

- `/login` local password login
- `/api/auth/login`
- `/api/auth/logout`
- Auth gate for business pages and APIs

Capture:

- `/capture` text note form
- `/capture` real local image upload
- `/api/capture/text`
- `/api/capture/image`
- Uploaded images are stored under `data/attachments/`

Review:

- `/review` pending queue page
- search, content-type filter, and real/test/all record scope filter
- natural business fields instead of JSON editing
- Vision API extraction button for local image evidence
- `/api/review/pending`
- `/api/review/edit`
- `/api/review/confirm`
- `/api/review/skip`
- `/api/review/vision-extract`

Customers:

- `/customers` compact dashboard
- search, filter, sort
- `/customers/:id` first-screen action page
- latest communication card
- Morning Brief
- open tasks list

Tasks:

- `/tasks` task creation form
- task list
- complete and reopen actions
- `/api/tasks`
- `/api/tasks/complete`
- `/api/tasks/reopen`

Reports:

- `/reports/weekly`
- Weekly customer activity
- Weekly open to-do list

## What Does Not Exist Yet

Current V1 intentionally does not include:

- OCR
- complex team permissions
- cloud deployment
- final lead segmentation rules
- automatic ingestion
- automatic customer merge
- batch confirm
- batch delete
- offline PWA support

## Non-Negotiables

- Person-first CRM, not company-first for V1.
- Review-first extraction, not automatic ingestion.
- PWA-first, not Discord-first.
- Local-first until the loop is proven.
- Original evidence must be retained.
- Follow-up state refresh is core, not a nice-to-have.
- Documents must be self-contained.

## Project Context

Primary project documents live in:

```text
context/
```

System logs live in:

```text
context/system_logs/
```

The current working plan is:

```text
context/23_Cycle_Goal_手机端上线冲刺.md
```
