import { describe, expect, it } from "vitest";
import { buildDatabaseReadinessReport } from "./readiness";

describe("database readiness", () => {
  it("reports missing CRM tables before cloud dogfood", () => {
    expect(buildDatabaseReadinessReport(["users", "parties"])).toEqual({
      requiredTables: ["users", "parties", "events", "attachments", "tasks"],
      existingTables: ["users", "parties"],
      missingTables: ["events", "attachments", "tasks"],
      ready: false,
    });
  });

  it("passes when all CRM tables exist", () => {
    expect(
      buildDatabaseReadinessReport([
        "attachments",
        "events",
        "parties",
        "tasks",
        "users",
      ]),
    ).toEqual({
      requiredTables: ["users", "parties", "events", "attachments", "tasks"],
      existingTables: ["attachments", "events", "parties", "tasks", "users"],
      missingTables: [],
      ready: true,
    });
  });
});
