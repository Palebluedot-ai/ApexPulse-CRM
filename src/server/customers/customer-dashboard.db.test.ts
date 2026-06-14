import { afterEach, beforeEach, expect, test } from "vitest";
import {
  createTestDb,
  seedEvent,
  seedParty,
  seedUser,
  type TestDb,
} from "@/server/db/test-db";
import {
  getCustomerFirstScreen,
  listCustomerListItems,
  listCustomerTimeline,
} from "./customer-dashboard";

let ctx: TestDb;

beforeEach(async () => {
  ctx = await createTestDb();
});

afterEach(async () => {
  await ctx.close();
});

test("listCustomerListItems only returns customers created by the given user", async () => {
  const alice = await seedUser(ctx.db);
  const bob = await seedUser(ctx.db);
  await seedParty(ctx.db, {
    displayName: "alice customer",
    createdByUserId: alice.id,
  });
  await seedParty(ctx.db, {
    displayName: "bob customer",
    createdByUserId: bob.id,
  });

  const aliceCustomers = await listCustomerListItems(ctx.db, alice.id);

  expect(aliceCustomers.map((c) => c.displayName)).toEqual(["alice customer"]);
});

test("getCustomerFirstScreen returns null when the customer belongs to another user", async () => {
  const alice = await seedUser(ctx.db);
  const bob = await seedUser(ctx.db);
  const party = await seedParty(ctx.db, { createdByUserId: alice.id });

  expect(await getCustomerFirstScreen(ctx.db, party.id, bob.id)).toBeNull();
  expect(
    await getCustomerFirstScreen(ctx.db, party.id, alice.id),
  ).not.toBeNull();
});

test("listCustomerTimeline is empty when the customer belongs to another user", async () => {
  const alice = await seedUser(ctx.db);
  const bob = await seedUser(ctx.db);
  const party = await seedParty(ctx.db, { createdByUserId: alice.id });
  await seedEvent(ctx.db, {
    partyId: party.id,
    reviewStatus: "confirmed",
    createdByUserId: alice.id,
  });

  expect(await listCustomerTimeline(ctx.db, party.id, bob.id)).toEqual([]);
  expect(await listCustomerTimeline(ctx.db, party.id, alice.id)).toHaveLength(1);
});
