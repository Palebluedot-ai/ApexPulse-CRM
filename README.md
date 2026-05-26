# HashKey OTC CRM V1

PWA-first personal CRM for OTC relationship follow-up.

This project starts as Chao's side project. V1 is not a HashKey internal compliance system. The current priority is proving one local-first working loop before adding cloud deployment, team permissions, OCR, or AI extraction.

## Current Stage

M1 is now dogfoodable locally.

The app can run these page-level flows:

- Capture text notes and image evidence metadata.
- Review pending records before they enter customer history.
- Confirm, edit, or skip review items.
- Browse customers in a compact card dashboard.
- Open a customer detail action page with latest communication, Morning Brief, open tasks, and next step.
- Create, complete, and reopen follow-up tasks.

## First Product Loop

```text
新增录入 -> 待确认 -> 确认入库 -> 客户详情 -> 任务 -> 下一次跟进
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
```

Customer detail pages use:

```text
/customers/:id
```

## Dogfood Guide

Use this document for the full local manual test:

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

Capture:

- `/capture` text note form
- `/capture` image evidence metadata form
- `/api/capture/text`
- `/api/capture/image`

Review:

- `/review` pending queue page
- search and content-type filter
- JSON object validation before edit or confirm
- `/api/review/pending`
- `/api/review/edit`
- `/api/review/confirm`
- `/api/review/skip`

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

## What Does Not Exist Yet

Current V1 intentionally does not include:

- real file upload
- OCR
- Vision API
- real API keys
- real customer data
- complex team permissions
- cloud deployment
- final lead segmentation rules
- automatic ingestion

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
context/13_M1_working_plan.md
```
