import { describe, expect, it } from "vitest";
import { getDatabaseUrl } from "./env";

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
});
