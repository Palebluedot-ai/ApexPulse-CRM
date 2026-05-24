# HashKey OTC CRM V1

PWA-first sales CRM for OTC relationship follow-up.

This project starts as Chao's personal side project. The first version is not a HashKey internal compliance system. The product can later move to a company server, Vercel, Supabase, AWS, or another host, but V1 should stay local-first and low-cost until the first working loop is proven.

## Current Stage

Phase 0 engineering skeleton has been created.

The app can run as a minimal PWA shell. Business logic still needs to follow document-driven development and test-first implementation.

## First Product Loop

1. Capture screenshots, text notes, or business card photos.
2. Keep the original evidence.
3. Generate a reviewable extracted result.
4. Let the user confirm or edit the result.
5. Write a customer timeline event.
6. Refresh the customer's follow-up state.
7. Create or update follow-up tasks.

## Development Commands

These commands will be available after dependencies are installed:

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm check
pnpm db:generate
pnpm db:migrate
pnpm db:migrate:local
pnpm db:seed:local
```

## Local Database

Start local Postgres:

```bash
docker compose up -d postgres
```

Run the migration against the local database:

```bash
pnpm db:migrate:local
```

Seed one demo user, customer, event, attachment, and task:

```bash
pnpm db:seed:local
```

## Capture API

Create a text note event:

```bash
curl -X POST http://localhost:3000/api/capture/text \
  -H 'Content-Type: application/json' \
  -d '{"rawText":"今天补录：在展会认识陈总，他想下周了解 OTC 出入金流程。"}'
```

Create an image evidence event and attachment record:

```bash
curl -X POST http://localhost:3000/api/capture/image \
  -H 'Content-Type: application/json' \
  -d '{"storageKey":"uploads/demo-screenshot.png","fileName":"demo-screenshot.png","mimeType":"image/png","fileSize":180000,"width":1170,"height":2532,"note":"这是今天跟刘总的微信截图"}'
```

The current capture API only records metadata and original notes. OCR or Vision extraction is intentionally not connected yet, so no external API key is required at this stage.

## Non-Negotiables

- Person-first CRM, not company-first for V1.
- Review-first extraction, not automatic ingestion.
- PWA-first, not Discord-first.
- Original evidence must be retained.
- Follow-up state refresh is core, not a nice-to-have.
- Documents must be self-contained.
