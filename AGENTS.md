# HashKey OTC CRM V1 - Project Rules

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

## Communication Rules

- Explain key technical choices briefly in Chinese.
- Avoid corporate jargon.
- Prefer concrete tradeoffs over vague reassurance.
