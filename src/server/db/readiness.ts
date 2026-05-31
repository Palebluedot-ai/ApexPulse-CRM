export const requiredDatabaseTables = [
  "users",
  "parties",
  "events",
  "attachments",
  "tasks",
] as const;

export interface DatabaseReadinessReport {
  requiredTables: string[];
  existingTables: string[];
  missingTables: string[];
  ready: boolean;
}

export function buildDatabaseReadinessReport(
  existingTables: string[],
): DatabaseReadinessReport {
  const existing = new Set(existingTables);
  const missingTables = requiredDatabaseTables.filter(
    (table) => !existing.has(table),
  );

  return {
    requiredTables: [...requiredDatabaseTables],
    existingTables,
    missingTables,
    ready: missingTables.length === 0,
  };
}
