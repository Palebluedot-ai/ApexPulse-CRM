import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import type { Event, Party, Task, User } from "./schema";

/**
 * In-memory Postgres (PGlite) for integration tests. The query functions are
 * typed against postgres-js; the PGlite drizzle instance exposes the same query
 * API, so we cast it to the production Db type.
 */
type Db = PostgresJsDatabase<typeof schema>;

const migrationsFolder = fileURLToPath(new URL("./migrations", import.meta.url));

export interface TestDb {
  db: Db;
  close: () => Promise<void>;
}

export async function createTestDb(): Promise<TestDb> {
  const pglite = new PGlite();
  const db = drizzle(pglite, { schema });
  await migrate(db, { migrationsFolder });

  return {
    db: db as unknown as Db,
    close: () => pglite.close(),
  };
}

export async function seedUser(
  db: Db,
  overrides: Partial<schema.NewUser> = {},
): Promise<User> {
  const [user] = await db
    .insert(schema.users)
    .values({
      email: overrides.email ?? `user-${randomUUID()}@example.com`,
      displayName: overrides.displayName ?? "Test User",
      ...overrides,
    })
    .returning();
  return user;
}

export async function seedParty(
  db: Db,
  overrides: Partial<schema.NewParty> = {},
): Promise<Party> {
  const [party] = await db
    .insert(schema.parties)
    .values({
      displayName: overrides.displayName ?? "Test Customer",
      ...overrides,
    })
    .returning();
  return party;
}

export async function seedEvent(
  db: Db,
  overrides: Partial<schema.NewEvent> = {},
): Promise<Event> {
  const [event] = await db
    .insert(schema.events)
    .values({
      contentType: overrides.contentType ?? "text",
      ...overrides,
    })
    .returning();
  return event;
}

export async function seedTask(
  db: Db,
  overrides: Partial<schema.NewTask> = {},
): Promise<Task> {
  const [task] = await db
    .insert(schema.tasks)
    .values({
      taskType: overrides.taskType ?? "followup",
      description: overrides.description ?? "Test task",
      ...overrides,
    })
    .returning();
  return task;
}
