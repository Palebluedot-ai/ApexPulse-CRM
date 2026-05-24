export const localDatabaseUrl =
  "postgres://postgres:postgres@localhost:5432/hashkey_otc_crm_v1";

export function getDatabaseUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  return env.DATABASE_URL?.trim() || localDatabaseUrl;
}
