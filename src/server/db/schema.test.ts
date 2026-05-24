import { getTableColumns, getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  attachments,
  contentTypeEnum,
  events,
  followupStatusEnum,
  parties,
  reviewStatusEnum,
  sourceChannelEnum,
  taskStatusEnum,
  tasks,
  users,
} from "./schema";

function columnNames(table: Parameters<typeof getTableColumns>[0]) {
  return Object.keys(getTableColumns(table));
}

describe("database schema", () => {
  it("defines the five core tables for the first CRM loop", () => {
    expect([
      getTableName(users),
      getTableName(parties),
      getTableName(events),
      getTableName(attachments),
      getTableName(tasks),
    ]).toEqual(["users", "parties", "events", "attachments", "tasks"]);
  });

  it("keeps review-first ingestion and local-first source metadata explicit", () => {
    expect(reviewStatusEnum.enumValues).toEqual([
      "pending_review",
      "confirmed",
      "skipped",
    ]);
    expect(contentTypeEnum.enumValues).toEqual(["image", "text", "card_photo"]);
    expect(sourceChannelEnum.enumValues).toEqual(["pwa", "manual", "import"]);
  });

  it("keeps follow-up and task states deliberately small for V1", () => {
    expect(followupStatusEnum.enumValues).toEqual([
      "up_to_date",
      "due_soon",
      "overdue",
      "unknown",
    ]);
    expect(taskStatusEnum.enumValues).toEqual(["open", "done"]);
  });

  it("stores customers as people with future team ownership fields", () => {
    expect(columnNames(parties)).toEqual(
      expect.arrayContaining([
        "id",
        "displayName",
        "companyName",
        "handlesJson",
        "referralSourceTag",
        "statusLabel",
        "tags",
        "profileSummary",
        "lastContactAt",
        "lastContactSummary",
        "lastContactEventId",
        "nextFollowupAt",
        "followupStatus",
        "ownerUserId",
        "createdByUserId",
        "reviewedByUserId",
        "updatedByUserId",
        "createdAt",
        "updatedAt",
      ]),
    );
  });

  it("separates raw evidence, extracted fields, and review status on events", () => {
    expect(columnNames(events)).toEqual(
      expect.arrayContaining([
        "id",
        "partyId",
        "sourceChannel",
        "contentType",
        "rawText",
        "aiSummary",
        "extractedFieldsJson",
        "reviewStatus",
        "occurredAt",
        "capturedAt",
        "createdByUserId",
        "reviewedByUserId",
        "createdAt",
        "updatedAt",
      ]),
    );
  });

  it("keeps screenshots and business-card images as first-class evidence", () => {
    expect(columnNames(attachments)).toEqual(
      expect.arrayContaining([
        "id",
        "eventId",
        "storageKey",
        "fileName",
        "mimeType",
        "fileSize",
        "width",
        "height",
        "createdAt",
      ]),
    );
  });

  it("supports automatic and manual follow-up tasks", () => {
    expect(columnNames(tasks)).toEqual(
      expect.arrayContaining([
        "id",
        "partyId",
        "sourceEventId",
        "taskType",
        "description",
        "dueAt",
        "status",
        "createdByUserId",
        "completedByUserId",
        "completedAt",
        "createdAt",
        "updatedAt",
      ]),
    );
  });
});
