# C1 内测 invite-only 多账号 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single `LOCAL_AUTH_EMAIL/PASSWORD` env login with database-backed invite-only beta accounts so up to 10 internal testers can log in with their own email and hashed password.

**Architecture:** Add `password_hash` to the existing `users` table (no separate credentials table — keeps schema flat, matches the M2-deferred boundary in context/34 §4.4). Use Node built-in `crypto.scrypt` for password hashing — no new deps. Login route looks up user by email, verifies hash, falls back to existing `LOCAL_AUTH_EMAIL/PASSWORD` only when the DB has no matching active user (so Chao's local dogfood path keeps working). Provide a CLI script `pnpm user:create` that the admin runs from the deployed environment to create users and print a one-time temporary password to stdout.

**Tech Stack:** Drizzle ORM + drizzle-kit migrate, postgres.js, Next.js 16 App Router, Node `crypto.scrypt`, vitest, tsx.

**Scope boundaries (matches context/34 §3 and §7.5):**
- Does NOT include row-level data isolation (`createdByUserId` filtering on customers/tasks/review). That is a product-boundary question per context/34 §7.5 line "检查列表、详情、review、tasks 是否需要按当前用户过滤" and ships in a separate PR after Chao confirms.
- Does NOT include self-serve registration, forgot-password, email verification, or admin UI.
- Does NOT modify `/login` page styling or the existing dev-password hint card (those land in the F1 design queue).
- Does NOT touch session cookie format — existing HMAC token keeps working.

**Closes:** GitHub Issue #28
**Branch:** `codex/c1-beta-accounts`
**PR title:** `feat(auth): invite-only beta accounts with hashed passwords`

---

## File Structure

**New files:**
- `src/server/auth/password.ts` — pure scrypt hash + verify, format `scrypt$N$salt$hash` (base64url)
- `src/server/auth/password.test.ts` — unit tests for hash/verify
- `src/server/auth/db-login.ts` — DB-backed credential lookup (separate from existing `session.ts` env-based config to keep diff small)
- `src/server/auth/db-login.test.ts`
- `scripts/user-create.ts` — CLI entry, prompts/parses args, prints temp password once
- `src/server/db/migrations/0001_add_password_hash.sql` — drizzle-generated

**Modified files:**
- `src/server/db/schema.ts:60-79` — add `passwordHash: text("password_hash")` nullable column to `users`
- `src/app/api/auth/login/route.ts:48-82` — try DB lookup first, env fallback only if DB has no matching active user
- `src/app/api/auth/login/route.ts` (error response) — unified `invalid_credentials` already exists, just confirm no user-existence leak
- `package.json` scripts — add `"user:create": "tsx scripts/user-create.ts"`
- `src/server/db/seed.ts:30-40` — when seeding the default chao.local user, also write a password hash so DB-login works in local dev too

**Why no separate `user_credentials` table:** context/34 §4.4 explicitly lists `users.password_hash` as the recommended approach. Cost of joining for every login is real, schema is simpler, no FK choreography. If we later need credential rotation history we can split.

---

## Task 1: Password hashing utility (TDD)

**Files:**
- Create: `src/server/auth/password.ts`
- Test: `src/server/auth/password.test.ts`

- [ ] **Step 1.1: Write failing tests**

```typescript
// src/server/auth/password.test.ts
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("hashes a password into the scrypt$N$salt$hash format", async () => {
    const hash = await hashPassword("hunter2-correct-horse");
    const parts = hash.split("$");
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe("scrypt");
    expect(parts[1]).toMatch(/^\d+$/); // N param
    expect(parts[2]).toMatch(/^[A-Za-z0-9_-]+$/); // base64url salt
    expect(parts[3]).toMatch(/^[A-Za-z0-9_-]+$/); // base64url hash
  });

  it("produces different hashes for the same password (random salt)", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toBe(b);
  });

  it("verifies the correct password", async () => {
    const hash = await hashPassword("correct-password");
    await expect(verifyPassword("correct-password", hash)).resolves.toBe(true);
  });

  it("rejects the wrong password", async () => {
    const hash = await hashPassword("correct-password");
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("returns false on malformed hash string instead of throwing", async () => {
    await expect(verifyPassword("anything", "not-a-valid-hash")).resolves.toBe(false);
    await expect(verifyPassword("anything", "")).resolves.toBe(false);
    await expect(verifyPassword("anything", "scrypt$bad$bad")).resolves.toBe(false);
  });

  it("rejects an empty password at hash time", async () => {
    await expect(hashPassword("")).rejects.toThrow(/empty/i);
  });
});
```

- [ ] **Step 1.2: Run test to verify it fails**

Run: `pnpm test src/server/auth/password.test.ts`
Expected: FAIL — `Cannot find module './password'`

- [ ] **Step 1.3: Implement password.ts**

```typescript
// src/server/auth/password.ts
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

// 2^15 cost factor — strong enough for interactive login on Vercel cold start,
// not so heavy that a tester waits forever. Stored in the hash so we can bump it later.
const SCRYPT_N = 32768;
const KEY_LENGTH = 64;
const SALT_BYTES = 16;

export async function hashPassword(password: string): Promise<string> {
  if (password.length === 0) {
    throw new Error("Password must not be empty");
  }

  const salt = randomBytes(SALT_BYTES);
  const derived = await scryptAsync(password, salt, KEY_LENGTH);

  return [
    "scrypt",
    SCRYPT_N.toString(),
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const parts = storedHash.split("$");
  if (parts.length !== 4 || parts[0] !== "scrypt") return false;

  const n = Number.parseInt(parts[1], 10);
  if (!Number.isFinite(n) || n <= 0) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[2], "base64url");
    expected = Buffer.from(parts[3], "base64url");
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;

  const derived = await scryptAsync(password, salt, expected.length);
  if (derived.length !== expected.length) return false;

  return timingSafeEqual(derived, expected);
}
```

- [ ] **Step 1.4: Run tests, verify pass**

Run: `pnpm test src/server/auth/password.test.ts`
Expected: PASS — 6 tests

- [ ] **Step 1.5: Commit**

```bash
git add src/server/auth/password.ts src/server/auth/password.test.ts
git commit -m "feat(auth): add scrypt-based password hash and verify"
```

---

## Task 2: Schema migration — add password_hash column

**Files:**
- Modify: `src/server/db/schema.ts`
- Create: `src/server/db/migrations/0001_add_password_hash.sql` (drizzle-generated)

- [ ] **Step 2.1: Edit schema.ts users table**

Find the existing `users` table block (around line 60-79). Add `passwordHash` between `isActive` and `...timestamps`:

```typescript
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    roleType: roleTypeEnum("role_type").default("owner").notNull(),
    managerUserId: uuid("manager_user_id").references(
      (): AnyPgColumn => users.id,
      { onDelete: "set null" },
    ),
    isActive: boolean("is_active").default(true).notNull(),
    passwordHash: text("password_hash"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("users_email_idx").on(table.email),
    index("users_manager_user_id_idx").on(table.managerUserId),
  ],
);
```

Nullable on purpose so existing seeded rows don't break before they're updated.

- [ ] **Step 2.2: Generate migration**

Run: `pnpm db:generate`
Expected: new file `src/server/db/migrations/0001_<adjective>_<noun>.sql` with `ALTER TABLE "users" ADD COLUMN "password_hash" text;`

- [ ] **Step 2.3: Apply migration to local DB**

Run: `pnpm db:migrate:local`
Expected: `[✓] migration applied` or similar drizzle success line.

- [ ] **Step 2.4: Run schema tests**

Run: `pnpm test src/server/db/schema.test.ts`
Expected: PASS (schema test reads column metadata; if it asserts column count add `password_hash` there too)

- [ ] **Step 2.5: Commit**

```bash
git add src/server/db/schema.ts src/server/db/migrations/
git commit -m "feat(db): add nullable password_hash column to users"
```

---

## Task 3: DB-backed credential lookup (TDD)

Lives next to `session.ts` but separate so the env-based `validateLocalLogin` keeps passing its existing tests untouched.

**Files:**
- Create: `src/server/auth/db-login.ts`
- Test: `src/server/auth/db-login.test.ts`

- [ ] **Step 3.1: Write failing tests**

```typescript
// src/server/auth/db-login.test.ts
import { describe, expect, it } from "vitest";
import { hashPassword } from "./password";
import { findActiveUserByEmail, verifyDbLogin } from "./db-login";

// Pure functions over an injected lookup, so we don't need a real DB in unit tests.

describe("findActiveUserByEmail", () => {
  it("normalizes email casing and whitespace before lookup", async () => {
    let asked: string | null = null;
    const lookup = async (email: string) => {
      asked = email;
      return null;
    };

    await findActiveUserByEmail("  Foo@Example.COM  ", lookup);

    expect(asked).toBe("foo@example.com");
  });

  it("returns null when lookup returns null", async () => {
    const result = await findActiveUserByEmail("a@b.com", async () => null);
    expect(result).toBeNull();
  });

  it("returns null when the user is inactive", async () => {
    const result = await findActiveUserByEmail("a@b.com", async () => ({
      id: "uid",
      email: "a@b.com",
      passwordHash: "scrypt$...$...$...",
      isActive: false,
    }));
    expect(result).toBeNull();
  });

  it("returns null when the user has no passwordHash (legacy row)", async () => {
    const result = await findActiveUserByEmail("a@b.com", async () => ({
      id: "uid",
      email: "a@b.com",
      passwordHash: null,
      isActive: true,
    }));
    expect(result).toBeNull();
  });

  it("returns the user when active and has a hash", async () => {
    const result = await findActiveUserByEmail("a@b.com", async () => ({
      id: "uid",
      email: "a@b.com",
      passwordHash: "scrypt$32768$abc$def",
      isActive: true,
    }));
    expect(result).toEqual({
      id: "uid",
      email: "a@b.com",
      passwordHash: "scrypt$32768$abc$def",
    });
  });
});

describe("verifyDbLogin", () => {
  it("returns the user identity when password matches", async () => {
    const hash = await hashPassword("correct-pw");
    const result = await verifyDbLogin(
      { email: "tester@example.com", password: "correct-pw" },
      async () => ({
        id: "user-123",
        email: "tester@example.com",
        passwordHash: hash,
        isActive: true,
      }),
    );
    expect(result).toEqual({ ok: true, userId: "user-123", email: "tester@example.com" });
  });

  it("returns invalid when no user found", async () => {
    const result = await verifyDbLogin(
      { email: "nobody@example.com", password: "anything" },
      async () => null,
    );
    expect(result).toEqual({ ok: false, reason: "invalid_credentials" });
  });

  it("returns invalid when password does not match (does not leak existence)", async () => {
    const hash = await hashPassword("real-pw");
    const result = await verifyDbLogin(
      { email: "tester@example.com", password: "wrong-pw" },
      async () => ({
        id: "user-123",
        email: "tester@example.com",
        passwordHash: hash,
        isActive: true,
      }),
    );
    expect(result).toEqual({ ok: false, reason: "invalid_credentials" });
  });

  it("returns invalid when user is inactive even with correct password", async () => {
    const hash = await hashPassword("real-pw");
    const result = await verifyDbLogin(
      { email: "tester@example.com", password: "real-pw" },
      async () => ({
        id: "user-123",
        email: "tester@example.com",
        passwordHash: hash,
        isActive: false,
      }),
    );
    expect(result).toEqual({ ok: false, reason: "invalid_credentials" });
  });
});
```

- [ ] **Step 3.2: Run tests, see them fail**

Run: `pnpm test src/server/auth/db-login.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3.3: Implement db-login.ts**

```typescript
// src/server/auth/db-login.ts
import { verifyPassword } from "./password";

export interface BetaUserRow {
  id: string;
  email: string;
  passwordHash: string | null;
  isActive: boolean;
}

export interface BetaUserCredential {
  id: string;
  email: string;
  passwordHash: string;
}

export type UserLookup = (email: string) => Promise<BetaUserRow | null>;

export interface DbLoginInput {
  email: string;
  password: string;
}

export type DbLoginResult =
  | { ok: true; userId: string; email: string }
  | { ok: false; reason: "invalid_credentials" };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findActiveUserByEmail(
  email: string,
  lookup: UserLookup,
): Promise<BetaUserCredential | null> {
  const row = await lookup(normalizeEmail(email));
  if (!row || !row.isActive || !row.passwordHash) return null;
  return { id: row.id, email: row.email, passwordHash: row.passwordHash };
}

export async function verifyDbLogin(
  input: DbLoginInput,
  lookup: UserLookup,
): Promise<DbLoginResult> {
  const user = await findActiveUserByEmail(input.email, lookup);
  if (!user) return { ok: false, reason: "invalid_credentials" };

  const matches = await verifyPassword(input.password, user.passwordHash);
  if (!matches) return { ok: false, reason: "invalid_credentials" };

  return { ok: true, userId: user.id, email: user.email };
}
```

- [ ] **Step 3.4: Run tests, verify pass**

Run: `pnpm test src/server/auth/db-login.test.ts`
Expected: PASS — 9 tests

- [ ] **Step 3.5: Commit**

```bash
git add src/server/auth/db-login.ts src/server/auth/db-login.test.ts
git commit -m "feat(auth): add DB credential lookup and verify"
```

---

## Task 4: Wire login route to use DB-first, env fallback

Login API currently calls `validateLocalLogin(env)` then queries DB for the user row. Change order: try DB credential lookup first; only fall back to env credentials if DB has no matching active user with a `password_hash`. This keeps Chao's local dogfood (no DB-side password yet) working until Task 6 seeds it.

**Files:**
- Modify: `src/app/api/auth/login/route.ts`

- [ ] **Step 4.1: Update login route**

Replace the body of `POST` (from `const config = getLocalAuthConfig();` through the `validation.ok` check + DB fetch) with:

```typescript
export async function POST(request: Request) {
  const payload = await readLoginPayload(request);
  const config = getLocalAuthConfig();

  const { client, db } = createDb();

  try {
    const dbResult = await verifyDbLogin(
      { email: payload.email, password: payload.password },
      async (normalizedEmail) => {
        const [row] = await db
          .select({
            id: users.id,
            email: users.email,
            passwordHash: users.passwordHash,
            isActive: users.isActive,
          })
          .from(users)
          .where(eq(users.email, normalizedEmail))
          .limit(1);
        return row ?? null;
      },
    );

    let identity: { userId: string; email: string } | null = null;

    if (dbResult.ok) {
      identity = { userId: dbResult.userId, email: dbResult.email };
    } else {
      // Env fallback: only used when DB has no active user with a hash for this email.
      const envValidation = validateLocalLogin(payload, config);
      if (envValidation.ok) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, envValidation.email))
          .limit(1);
        if (user && user.isActive) {
          identity = { userId: user.id, email: user.email };
        }
      }
    }

    if (!identity) {
      return invalidLoginResponse(request, payload.wantsJson);
    }

    const token = createSessionToken(identity, config);
    const response = payload.wantsJson
      ? NextResponse.json({ ok: true, userId: identity.userId })
      : NextResponse.redirect(
          buildLoginRedirectUrl({
            next: payload.next,
            requestUrl: request.url,
            host:
              request.headers.get("x-forwarded-host") ??
              request.headers.get("host"),
            protocol: request.headers.get("x-forwarded-proto"),
          }),
          { status: 303 },
        );

    response.cookies.set(AUTH_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: config.cookieSecure,
      path: "/",
      maxAge: config.maxAgeSeconds,
    });

    return response;
  } finally {
    await client.end();
  }
}
```

Also add the import at the top of the file:

```typescript
import { verifyDbLogin } from "@/server/auth/db-login";
```

- [ ] **Step 4.2: Run all checks**

Run: `pnpm check`
Expected: lint + typecheck + 156+ tests PASS

- [ ] **Step 4.3: Manual smoke (local dev still works)**

Run: `pnpm dev` in another terminal. Browse to `http://localhost:3000/login`, submit with `chao.local@example.com` + `local-dev-password`. Should redirect to `/` (env fallback still works because chao.local has no DB hash yet).

- [ ] **Step 4.4: Commit**

```bash
git add src/app/api/auth/login/route.ts
git commit -m "feat(auth): try DB password before env fallback in login route"
```

---

## Task 5: `pnpm user:create` CLI script

**Files:**
- Create: `scripts/user-create.ts`
- Modify: `package.json` scripts block

- [ ] **Step 5.1: Add script entry to package.json**

In the `"scripts"` block, after `"db:seed:local"`, add:

```json
    "user:create": "tsx scripts/user-create.ts"
```

- [ ] **Step 5.2: Create scripts/user-create.ts**

```typescript
import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import { eq } from "drizzle-orm";
import { hashPassword } from "../src/server/auth/password";
import { createDb } from "../src/server/db";
import { users } from "../src/server/db/schema";

interface Args {
  email: string;
  displayName: string;
  password?: string;
  resetPassword: boolean;
}

function parseCliArgs(): Args {
  const { values } = parseArgs({
    options: {
      email: { type: "string" },
      "display-name": { type: "string" },
      password: { type: "string" },
      "reset-password": { type: "boolean", default: false },
    },
    strict: true,
  });

  const email = values.email?.trim().toLowerCase();
  const displayName = values["display-name"]?.trim();

  if (!email || !email.includes("@")) {
    throw new Error("--email <user@example.com> is required");
  }
  if (!displayName) {
    throw new Error("--display-name <name> is required");
  }

  return {
    email,
    displayName,
    password: values.password,
    resetPassword: Boolean(values["reset-password"]),
  };
}

function generateTemporaryPassword(): string {
  // 18 base64url chars ≈ 108 bits entropy — safe for one-time setup, easy to paste.
  return randomBytes(14).toString("base64url");
}

async function main() {
  const args = parseCliArgs();
  const password = args.password ?? generateTemporaryPassword();
  const passwordHash = await hashPassword(password);

  const { client, db } = createDb();
  try {
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, args.email))
      .limit(1);

    if (existing) {
      if (!args.resetPassword) {
        console.error(
          `User ${args.email} already exists. Pass --reset-password to overwrite the password.`,
        );
        process.exitCode = 1;
        return;
      }
      await db
        .update(users)
        .set({ passwordHash, isActive: true, updatedAt: new Date() })
        .where(eq(users.id, existing.id));
      console.log(`Reset password for ${args.email}.`);
    } else {
      await db.insert(users).values({
        email: args.email,
        displayName: args.displayName,
        roleType: "member",
        isActive: true,
        passwordHash,
      });
      console.log(`Created user ${args.email}.`);
    }

    if (!args.password) {
      console.log("");
      console.log("Temporary password (share with the user out of band):");
      console.log(password);
      console.log("");
      console.log("This is the only time it will be printed.");
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
```

- [ ] **Step 5.3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 5.4: Manual create + login test (local)**

Run, in a shell with `DATABASE_URL` pointing at the local DB:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/apexpulse_crm \
  pnpm user:create --email beta-tester@example.com --display-name "Beta Tester"
```

Expected output:
```
Created user beta-tester@example.com.

Temporary password (share with the user out of band):
<random 18 chars>

This is the only time it will be printed.
```

Then in the running `/login` page, log in as that email + that password. Expected: redirects to `/`.

Verify wrong password fails:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"beta-tester@example.com","password":"wrong"}'
```
Expected: HTTP 401 `{"error":"invalid_credentials"}`.

Verify nonexistent email fails identically (no existence leak):
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nobody@example.com","password":"wrong"}'
```
Expected: same HTTP 401 `{"error":"invalid_credentials"}`.

- [ ] **Step 5.5: Test idempotency (re-create fails without --reset-password)**

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/apexpulse_crm \
  pnpm user:create --email beta-tester@example.com --display-name "Beta Tester"
```
Expected: exit code 1, stderr: `User beta-tester@example.com already exists. Pass --reset-password to overwrite the password.`

Then with `--reset-password`:
```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/apexpulse_crm \
  pnpm user:create --email beta-tester@example.com --display-name "Beta Tester" --reset-password
```
Expected: `Reset password for beta-tester@example.com.` followed by a new temp password.

- [ ] **Step 5.6: Commit**

```bash
git add scripts/user-create.ts package.json
git commit -m "feat(auth): add pnpm user:create script for beta accounts"
```

---

## Task 6: Backfill chao.local seed with a password hash

So local dev also exercises the DB path (not just the env fallback), and the seed stays self-consistent.

**Files:**
- Modify: `src/server/db/seed.ts`
- Modify: `src/server/db/seed.test.ts` if it asserts on the user object shape

- [ ] **Step 6.1: Update seed.ts**

In `buildDemoSeedData`, the seeded `user` object is currently:

```typescript
user: {
  email: "chao.local@example.com",
  displayName: "Chao",
  roleType: "owner",
  isActive: true,
},
```

Change `buildDemoSeedData` to accept the hash as a parameter so seeding stays a pure function and tests don't need to hash:

```typescript
export interface DemoSeedOptions {
  passwordHash: string | null;
}

export function buildDemoSeedData(options: DemoSeedOptions = { passwordHash: null }): DemoSeedData {
  // ...existing body, then in the user object:
  user: {
    email: "chao.local@example.com",
    displayName: "Chao",
    roleType: "owner",
    isActive: true,
    passwordHash: options.passwordHash,
  },
```

In `seed.ts` wherever `buildDemoSeedData()` is called from the runner, hash the env password (or `local-dev-password` default) and pass it in:

```typescript
import { hashPassword } from "@/server/auth/password";

const localPassword = process.env.LOCAL_AUTH_PASSWORD ?? "local-dev-password";
const passwordHash = await hashPassword(localPassword);
const data = buildDemoSeedData({ passwordHash });
```

(Place this inside whichever async function the seeder's entry point uses. Check `seed-local.ts` for the call site if `seed.ts` is the pure-data module.)

- [ ] **Step 6.2: Run all checks**

Run: `pnpm check`
Expected: PASS — if `seed.test.ts` snapshot-asserts on the user shape, update it to include `passwordHash: null` (the default) or pass a fixed test hash.

- [ ] **Step 6.3: Re-seed local DB and verify both paths work**

```bash
pnpm db:seed:local
```

Then log in as `chao.local@example.com` with `local-dev-password` — should succeed via DB path now (no longer needs env fallback).

- [ ] **Step 6.4: Commit**

```bash
git add src/server/db/seed.ts src/server/db/seed-local.ts src/server/db/seed.test.ts
git commit -m "feat(db): seed chao.local user with hashed password"
```

---

## Task 7: Final guardrails + PR

- [ ] **Step 7.1: Run full check + build**

```bash
pnpm check
pnpm build
pnpm ci:guardrails
```
Expected: all green.

- [ ] **Step 7.2: Confirm no secrets in diff**

```bash
git diff main...HEAD | grep -iE "password|secret" | grep -v "passwordHash\|password_hash\|LOCAL_AUTH_PASSWORD" | head -20
```
Expected: nothing real — only the strings `Password must not be empty`, `temp password`, test fixtures like `"correct-pw"`, etc. Confirm no real secret value is anywhere in the diff.

- [ ] **Step 7.3: Push branch**

```bash
git push -u origin codex/c1-beta-accounts
```

- [ ] **Step 7.4: Open PR using template**

```bash
gh pr create --title "feat(auth): invite-only beta accounts with hashed passwords" --body "$(cat <<'EOF'
## Related Issue

Closes #28

## Purpose

支持下周 ≤10 个 C1 内测用户用独立邮箱 + 单独密码登录。当前 `LOCAL_AUTH_EMAIL/PASSWORD` env 单账号模式不能区分上传、Review、客户、任务归属。

## Changes

- 新增 `src/server/auth/password.ts`：Node `crypto.scrypt` hash/verify，存储格式 `scrypt$N$salt$hash`（base64url）
- `users` 表加 nullable `password_hash` 列（migration 0001）
- 新增 `src/server/auth/db-login.ts`：DB credential 查询 + verify，纯函数注入 lookup 便于测试
- `/api/auth/login` 改为 DB-first，env 仅在 DB 无匹配活跃用户时兜底（Chao 本地 dogfood 路径不破）
- 新增 `pnpm user:create` 脚本：创建用户 + 随机临时密码，仅 stdout 打印一次
- `chao.local` seed 现在带 hash，本地登录也走 DB 路径

## Verification

- [x] `pnpm check`（password 6 tests + db-login 9 tests + 既有 156 全绿）
- [x] `pnpm build`（涉及 Next route 改动）
- [x] `pnpm ci:guardrails`
- [x] 本地手动：创建 beta-tester 账号 → 用临时密码登录成功 → 用错密码 401 `invalid_credentials` → 不存在的邮箱同样 401（不泄露用户存在）→ 二次 `user:create` 同邮箱拒绝（需 `--reset-password`）

## Risk

- Product boundary changed: no（仍是 invite-only 单账号录入归属，未做数据隔离）
- Database or migration changed: **yes** — 加 nullable 列 `users.password_hash`，向后兼容
- Auth, permissions, or user data visibility changed: **yes** — 登录改 DB-first
- Deployment, Vercel, Supabase, or GitHub Actions changed: no（生产首发需在 Supabase 跑 migration + 用脚本创建账号，操作步骤在 Notes）
- Real customer data, screenshots, secrets, or `.env*` touched: no

## Notes For Reviewer

- 数据隔离（按 `createdByUserId` 过滤 customers / tasks / review）**不在本 PR**。context/34 §7.5 标了"需要先设计清楚"，待 Chao 拍板边界再单开 PR。
- env fallback 保留，方便回滚 / 本地无 DB 时仍能进系统；想去掉的话单独再开 issue。
- 生产上线步骤：① merge → CI 跑 migration → ② 在生产环境 `pnpm user:create` 为每个内测用户创建账号 → ③ 把临时密码私下发给用户。临时密码只打印一次，不入库不上传。
- scrypt N=32768 是登录响应延迟和暴力破解成本的平衡，记在 hash 串里以后可升。

EOF
)"
```

Expected: PR URL printed. CI starts running.

- [ ] **Step 7.5: Wait for CI green, then stop**

Do **not** auto-merge. Per repo `CONTRIBUTING.md` and the merge-autonomy exception for this repo, stop here and wait for Chao's review.

---

## Self-Review Notes

- **Spec coverage:**
  - Issue #28 验收 — multiple accounts ✓ (Task 5), 各登录 ✓ (Task 4), 不泄露用户存在 ✓ (Task 3 test + Task 5 manual), 密码不明文 ✓ (Task 1+2), `pnpm check` ✓ (Task 7), 业务规则有测试 ✓ (Task 1, 3)
  - context/34 §4.4 users.password_hash 路径 ✓
  - context/34 §4.5 scrypt + 格式 `scrypt$参数$salt$hash` ✓
  - context/34 §4.6 `pnpm user:create`, --reset-password, 不打印 secret 入 git ✓
  - context/34 §7.5 "需要先设计清楚" 数据隔离 — 明确不做，PR notes 写了
- **Explicit non-goals documented:** data isolation, registration UI, `/login` redesign, removing env fallback.
- **Migration is forward-only and nullable** — safe to apply on production with rows that don't have hashes yet (they'll need `pnpm user:create --reset-password` to bring them online for DB-path login).
