import { defineConfig } from "drizzle-kit";
import { getMigrationDatabaseUrl } from "./src/server/db/env";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./src/server/db/migrations",
  dbCredentials: {
    url: getMigrationDatabaseUrl(),
  },
  strict: true,
  verbose: true,
});
