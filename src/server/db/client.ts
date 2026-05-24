import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getDatabaseUrl } from "./env";
import * as schema from "./schema";

export function createPostgresConnection(databaseUrl = getDatabaseUrl()) {
  return postgres(databaseUrl, {
    max: 5,
  });
}

export function createDb(databaseUrl = getDatabaseUrl()) {
  const client = createPostgresConnection(databaseUrl);
  return {
    client,
    db: drizzle(client, { schema }),
  };
}
