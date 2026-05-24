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
```

## Non-Negotiables

- Person-first CRM, not company-first for V1.
- Review-first extraction, not automatic ingestion.
- PWA-first, not Discord-first.
- Original evidence must be retained.
- Follow-up state refresh is core, not a nice-to-have.
- Documents must be self-contained.
