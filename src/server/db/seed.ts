import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  attachments,
  events,
  parties,
  tasks,
  users,
  type NewAttachment,
  type NewEvent,
  type NewParty,
  type NewTask,
  type NewUser,
} from "./schema";

export interface DemoSeedData {
  user: NewUser;
  party: NewParty;
  event: NewEvent;
  attachment: Omit<NewAttachment, "eventId">;
  task: NewTask;
}

export interface DemoSeedOptions {
  passwordHash: string | null;
}

const now = new Date("2026-05-24T18:00:00+08:00");
const nextFollowupAt = new Date("2026-05-26T10:00:00+08:00");

export function buildDemoSeedData(
  options: DemoSeedOptions = { passwordHash: null },
): DemoSeedData {
  const aiSummary =
    "刘总在展会后继续了解 OTC 出入金方案，当前重点是确认公司主体、预计体量和开户材料。";

  return {
    user: {
      email: "chao.local@example.com",
      displayName: "Chao",
      roleType: "owner",
      isActive: true,
      passwordHash: options.passwordHash,
    },
    party: {
      displayName: "刘总",
      companyName: "Demo Capital",
      handlesJson: {
        wechat: "liu-demo",
        telegram: "@liu_demo",
      },
      referralSourceTag: "Token2049 展会",
      statusLabel: "新线索",
      tags: ["展会", "OTC", "高优先级"],
      profileSummary: "展会认识的机构客户，可能有 OTC 出入金需求。",
      lastContactAt: now,
      lastContactSummary: aiSummary,
      nextFollowupAt,
      followupStatus: "due_soon",
    },
    event: {
      sourceChannel: "pwa",
      contentType: "image",
      rawText:
        "[手动备注]\nToken2049 展会后补记：刘总想了解 OTC 出入金和机构开户流程。\n\n[截图OCR]\n刘总：我们公司之后可能有 USDT 出入金需求，先了解一下开户材料。\nChao：可以，我先整理材料清单给你。",
      aiSummary,
      extractedFieldsJson: {
        party_name: "刘总",
        company_name: "Demo Capital",
        source_context: "Token2049 展会认识",
        intent: "OTC 出入金和机构开户",
        next_actions: ["整理开户材料清单并发给刘总"],
        risks: ["公司主体和预计交易体量待确认"],
      },
      reviewStatus: "confirmed",
      occurredAt: now,
      capturedAt: now,
    },
    attachment: {
      storageKey: "demo/liu-token2049-screenshot.png",
      fileName: "liu-token2049-screenshot.png",
      mimeType: "image/png",
      fileSize: 128_000,
      width: 1170,
      height: 2532,
    },
    task: {
      taskType: "followup",
      description: "整理开户材料清单并发给刘总，确认公司主体和预计交易体量",
      dueAt: nextFollowupAt,
      status: "open",
    },
  };
}

type Db = PostgresJsDatabase<typeof import("./schema")>;

export async function seedDemoData(
  db: Db,
  options: DemoSeedOptions = { passwordHash: null },
) {
  const seed = buildDemoSeedData(options);

  const [user] = await db
    .insert(users)
    .values(seed.user)
    .onConflictDoUpdate({
      target: users.email,
      set: {
        displayName: seed.user.displayName,
        roleType: seed.user.roleType,
        isActive: seed.user.isActive,
        passwordHash: seed.user.passwordHash,
        updatedAt: new Date(),
      },
    })
    .returning();

  const existingParty = await db
    .select()
    .from(parties)
    .where(eq(parties.displayName, seed.party.displayName ?? ""))
    .limit(1);

  const [party] =
    existingParty.length > 0
      ? await db
          .update(parties)
          .set({
            ...seed.party,
            ownerUserId: user.id,
            createdByUserId: user.id,
            updatedByUserId: user.id,
            updatedAt: new Date(),
          })
          .where(eq(parties.id, existingParty[0].id))
          .returning()
      : await db
          .insert(parties)
          .values({
            ...seed.party,
            ownerUserId: user.id,
            createdByUserId: user.id,
            updatedByUserId: user.id,
          })
          .returning();

  const existingAttachment = await db
    .select()
    .from(attachments)
    .where(eq(attachments.storageKey, seed.attachment.storageKey))
    .limit(1);

  const eventValues = {
    ...seed.event,
    partyId: party.id,
    createdByUserId: user.id,
    reviewedByUserId: user.id,
  };

  const [event] =
    existingAttachment.length > 0
      ? await db
          .update(events)
          .set({
            ...eventValues,
            updatedAt: new Date(),
          })
          .where(eq(events.id, existingAttachment[0].eventId))
          .returning()
      : await db.insert(events).values(eventValues).returning();

  const [attachment] =
    existingAttachment.length > 0
      ? await db
          .update(attachments)
          .set({
            ...seed.attachment,
            eventId: event.id,
          })
          .where(eq(attachments.id, existingAttachment[0].id))
          .returning()
      : await db
          .insert(attachments)
          .values({
            ...seed.attachment,
            eventId: event.id,
          })
          .returning();

  const existingTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.sourceEventId, event.id))
    .limit(1);

  const [task] =
    existingTasks.length > 0
      ? await db
          .update(tasks)
          .set({
            ...seed.task,
            partyId: party.id,
            sourceEventId: event.id,
            createdByUserId: user.id,
            updatedAt: new Date(),
          })
          .where(eq(tasks.id, existingTasks[0].id))
          .returning()
      : await db
          .insert(tasks)
          .values({
            ...seed.task,
            partyId: party.id,
            sourceEventId: event.id,
            createdByUserId: user.id,
          })
          .returning();

  const [updatedParty] = await db
    .update(parties)
    .set({
      lastContactAt: event.occurredAt ?? event.capturedAt,
      lastContactSummary: event.aiSummary,
      lastContactEventId: event.id,
      nextFollowupAt: seed.party.nextFollowupAt,
      followupStatus: seed.party.followupStatus,
      reviewedByUserId: user.id,
      updatedByUserId: user.id,
      updatedAt: new Date(),
    })
    .where(eq(parties.id, party.id))
    .returning();

  return {
    user,
    party: updatedParty,
    event,
    attachment,
    task,
  };
}
