import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const roleTypeEnum = pgEnum("role_type", ["owner", "member"]);

export const reviewStatusEnum = pgEnum("review_status", [
  "pending_review",
  "confirmed",
  "skipped",
]);

export const followupStatusEnum = pgEnum("followup_status", [
  "up_to_date",
  "due_soon",
  "overdue",
  "unknown",
]);

export const taskStatusEnum = pgEnum("task_status", ["open", "done"]);

export const taskTypeEnum = pgEnum("task_type", [
  "commitment",
  "reminder",
  "followup",
]);

export const contentTypeEnum = pgEnum("content_type", [
  "image",
  "text",
  "card_photo",
]);

export const sourceChannelEnum = pgEnum("source_channel", [
  "pwa",
  "manual",
  "import",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    roleType: roleTypeEnum("role_type").default("owner").notNull(),
    managerUserId: uuid("manager_user_id").references(
      (): AnyPgColumn => users.id,
      { onDelete: "set null" },
    ),
    isActive: boolean("is_active").default(true).notNull(),
    passwordHash: text("password_hash"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("users_email_idx").on(table.email),
    index("users_manager_user_id_idx").on(table.managerUserId),
  ],
);

export const parties = pgTable(
  "parties",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    displayName: text("display_name").notNull(),
    companyName: text("company_name"),
    handlesJson: jsonb("handles_json")
      .$type<Record<string, string | string[] | null>>()
      .default({})
      .notNull(),
    referralSourceTag: text("referral_source_tag"),
    statusLabel: text("status_label"),
    tags: text("tags").array().default(sql`ARRAY[]::text[]`).notNull(),
    profileSummary: text("profile_summary"),
    lastContactAt: timestamp("last_contact_at", { withTimezone: true }),
    lastContactSummary: text("last_contact_summary"),
    lastContactEventId: uuid("last_contact_event_id"),
    nextFollowupAt: timestamp("next_followup_at", { withTimezone: true }),
    followupStatus: followupStatusEnum("followup_status")
      .default("unknown")
      .notNull(),
    ownerUserId: uuid("owner_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedByUserId: uuid("updated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => [
    index("parties_display_name_idx").on(table.displayName),
    index("parties_company_name_idx").on(table.companyName),
    index("parties_owner_user_id_idx").on(table.ownerUserId),
    index("parties_followup_status_idx").on(table.followupStatus),
    index("parties_next_followup_at_idx").on(table.nextFollowupAt),
  ],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    partyId: uuid("party_id").references(() => parties.id, {
      onDelete: "set null",
    }),
    sourceChannel: sourceChannelEnum("source_channel").default("pwa").notNull(),
    contentType: contentTypeEnum("content_type").notNull(),
    rawText: text("raw_text"),
    aiSummary: text("ai_summary"),
    extractedFieldsJson: jsonb("extracted_fields_json")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    reviewStatus: reviewStatusEnum("review_status")
      .default("pending_review")
      .notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }),
    capturedAt: timestamp("captured_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => [
    index("events_party_id_idx").on(table.partyId),
    index("events_review_status_idx").on(table.reviewStatus),
    index("events_source_channel_idx").on(table.sourceChannel),
    index("events_content_type_idx").on(table.contentType),
    index("events_captured_at_idx").on(table.capturedAt),
    index("events_occurred_at_idx").on(table.occurredAt),
  ],
);

export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSize: integer("file_size").notNull(),
    width: integer("width"),
    height: integer("height"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("attachments_event_id_idx").on(table.eventId),
    uniqueIndex("attachments_storage_key_idx").on(table.storageKey),
  ],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    partyId: uuid("party_id").references(() => parties.id, {
      onDelete: "set null",
    }),
    sourceEventId: uuid("source_event_id").references(() => events.id, {
      onDelete: "set null",
    }),
    taskType: taskTypeEnum("task_type").notNull(),
    description: text("description").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    status: taskStatusEnum("status").default("open").notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    completedByUserId: uuid("completed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("tasks_party_id_idx").on(table.partyId),
    index("tasks_source_event_id_idx").on(table.sourceEventId),
    index("tasks_status_idx").on(table.status),
    index("tasks_due_at_idx").on(table.dueAt),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Party = typeof parties.$inferSelect;
export type NewParty = typeof parties.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
