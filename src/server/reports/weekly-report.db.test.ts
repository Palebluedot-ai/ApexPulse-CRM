import { afterEach, beforeEach, expect, test } from "vitest";
import {
  createTestDb,
  seedEvent,
  seedParty,
  seedUser,
  type TestDb,
} from "@/server/db/test-db";
import { getWeeklyReport } from "./weekly-report";

let ctx: TestDb;

beforeEach(async () => {
  ctx = await createTestDb();
});

afterEach(async () => {
  await ctx.close();
});

test("getWeeklyReport only counts data created by the given user", async () => {
  const alice = await seedUser(ctx.db);
  const bob = await seedUser(ctx.db);
  const aliceParty = await seedParty(ctx.db, { createdByUserId: alice.id });
  const bobParty = await seedParty(ctx.db, { createdByUserId: bob.id });
  await seedEvent(ctx.db, {
    partyId: aliceParty.id,
    createdByUserId: alice.id,
    reviewStatus: "confirmed",
    aiSummary: "alice call",
  });
  await seedEvent(ctx.db, {
    partyId: bobParty.id,
    createdByUserId: bob.id,
    reviewStatus: "confirmed",
    aiSummary: "bob call",
  });

  const report = await getWeeklyReport(ctx.db, alice.id);

  expect(report.summary.newCustomerCount).toBe(1);
  expect(report.summary.confirmedEventCount).toBe(1);
  expect(report.touchedCustomers).toHaveLength(1);
});
