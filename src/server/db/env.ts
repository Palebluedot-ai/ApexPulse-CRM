export const localDatabaseUrl =
  "postgres://postgres:postgres@localhost:5432/apexpulse_crm";

export function getDatabaseUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  return env.DATABASE_URL?.trim() || localDatabaseUrl;
}

export function getMigrationDatabaseUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  return env.MIGRATION_DATABASE_URL?.trim() || getDatabaseUrl(env);
}

export function shouldPrepareStatements(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.DATABASE_PREPARE?.trim().toLowerCase() !== "false";
}
