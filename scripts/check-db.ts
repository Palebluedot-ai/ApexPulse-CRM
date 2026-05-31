import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
import { parseDotEnvContent } from "../src/server/config/deployment-env";
import {
  getDatabaseUrl,
  shouldPrepareStatements,
} from "../src/server/db/env";
import { buildDatabaseReadinessReport } from "../src/server/db/readiness";

const env = loadEnvFiles(process.cwd());
const sql = postgres(getDatabaseUrl(env), {
  max: 1,
  prepare: shouldPrepareStatements(env),
});

try {
  const databaseRows = await sql<{ database: string; schema: string }[]>`
    select current_database() as database, current_schema() as schema
  `;
  const tableRows = await sql<{ table_name: string }[]>`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
    order by table_name
  `;

  const report = buildDatabaseReadinessReport(
    tableRows.map((row) => row.table_name),
  );

  console.log("Database readiness check");
  console.log("");
  console.log(`Database: ${databaseRows[0]?.database ?? "unknown"}`);
  console.log(`Schema: ${databaseRows[0]?.schema ?? "unknown"}`);
  console.log(`Prepared statements: ${shouldPrepareStatements(env)}`);
  console.log("");
  console.log("Required tables:");
  for (const table of report.requiredTables) {
    console.log(`- ${table}`);
  }
  console.log("");
  console.log("Missing tables:");
  if (report.missingTables.length === 0) {
    console.log("- none");
  } else {
    for (const table of report.missingTables) {
      console.log(`- ${table}`);
    }
  }

  if (!report.ready) {
    process.exitCode = 1;
  }
} finally {
  await sql.end();
}

function loadEnvFiles(cwd: string): Record<string, string | undefined> {
  const dotenv = readOptionalDotEnv(join(cwd, ".env"));
  const dotenvLocal = readOptionalDotEnv(join(cwd, ".env.local"));

  return {
    ...dotenv,
    ...dotenvLocal,
    ...process.env,
  };
}

function readOptionalDotEnv(path: string): Record<string, string | undefined> {
  if (!existsSync(path)) return {};

  return parseDotEnvContent(readFileSync(path, "utf8"));
}
