import { describe, expect, it } from "vitest";
import {
  getDatabaseUrl,
  getMigrationDatabaseUrl,
  shouldPrepareStatements,
} from "./env";

describe("database environment", () => {
  it("uses DATABASE_URL when it is present", () => {
    expect(
      getDatabaseUrl({
        DATABASE_URL: "postgres://user:pass@localhost:5432/app",
      }),
    ).toBe("postgres://user:pass@localhost:5432/app");
  });

  it("uses the local development database url as an explicit fallback", () => {
    expect(getDatabaseUrl({})).toBe(
      "postgres://postgres:postgres@localhost:5432/hashkey_otc_crm_v1",
    );
  });

  it("uses MIGRATION_DATABASE_URL before DATABASE_URL for migration commands", () => {
    expect(
      getMigrationDatabaseUrl({
        DATABASE_URL: "postgres://runtime/app",
        MIGRATION_DATABASE_URL: "postgres://migration/app",
      }),
    ).toBe("postgres://migration/app");
  });

  it("keeps prepared statements on by default and can disable them for poolers", () => {
    expect(shouldPrepareStatements({})).toBe(true);
    expect(shouldPrepareStatements({ DATABASE_PREPARE: "false" })).toBe(false);
    expect(shouldPrepareStatements({ DATABASE_PREPARE: "FALSE" })).toBe(false);
  });
});
