import { afterEach, beforeEach, expect, test } from "vitest";
import {
  createTestDb,
  seedEvent,
  seedUser,
  type TestDb,
} from "@/server/db/test-db";
import {
  confirmReviewEvent,
  editReviewEvent,
  listPendingReviewItems,
  skipReviewEvent,
} from "./review-queue";

let ctx: TestDb;

beforeEach(async () => {
  ctx = await createTestDb();
});

afterEach(async () => {
  await ctx.close();
});

test("listPendingReviewItems only returns pending events created by the given user", async () => {
  const alice = await seedUser(ctx.db);
  const bob = await seedUser(ctx.db);
  await seedEvent(ctx.db, { createdByUserId: alice.id, rawText: "alice" });
  await seedEvent(ctx.db, { createdByUserId: bob.id, rawText: "bob" });

  const items = await listPendingReviewItems(ctx.db, alice.id);

  expect(items).toHaveLength(1);
  expect(items[0].event.createdByUserId).toBe(alice.id);
});

test("confirmReviewEvent refuses to confirm another user's event", async () => {
  const alice = await seedUser(ctx.db);
  const bob = await seedUser(ctx.db);
  const event = await seedEvent(ctx.db, { createdByUserId: alice.id });

  await expect(
    confirmReviewEvent(ctx.db, {
      eventId: event.id,
      currentUserId: bob.id,
      reviewedByUserId: bob.id,
      summary: "stolen",
      extractedFields: {},
    }),
  ).rejects.toThrow("Pending review event not found");
});

test("editReviewEvent refuses to edit another user's event", async () => {
  const alice = await seedUser(ctx.db);
  const bob = await seedUser(ctx.db);
  const event = await seedEvent(ctx.db, { createdByUserId: alice.id });

  await expect(
    editReviewEvent(ctx.db, {
      eventId: event.id,
      currentUserId: bob.id,
      summary: "stolen",
      extractedFields: {},
    }),
  ).rejects.toThrow("Pending review event not found");
});

test("skipReviewEvent refuses to skip another user's event", async () => {
  const alice = await seedUser(ctx.db);
  const bob = await seedUser(ctx.db);
  const event = await seedEvent(ctx.db, { createdByUserId: alice.id });

  await expect(
    skipReviewEvent(ctx.db, {
      eventId: event.id,
      currentUserId: bob.id,
      reviewedByUserId: bob.id,
    }),
  ).rejects.toThrow("Pending review event not found");
});
