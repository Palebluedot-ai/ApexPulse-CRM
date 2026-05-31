import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getDatabaseUrl, shouldPrepareStatements } from "./env";
import * as schema from "./schema";

export function createPostgresConnection(
  databaseUrl = getDatabaseUrl(),
  env: Record<string, string | undefined> = process.env,
) {
  return postgres(databaseUrl, {
    max: 5,
    prepare: shouldPrepareStatements(env),
  });
}

export function createDb(databaseUrl = getDatabaseUrl()) {
  const client = createPostgresConnection(databaseUrl);
  return {
    client,
    db: drizzle(client, { schema }),
  };
}
