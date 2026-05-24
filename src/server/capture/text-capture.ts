import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { events, type NewEvent } from "@/server/db/schema";

export interface TextCaptureInput {
  rawText: string;
  occurredAt?: Date;
  capturedAt?: Date;
  createdByUserId?: string;
}

export function buildTextCaptureEvent(input: TextCaptureInput): NewEvent {
  const rawText = input.rawText.trim();
  if (!rawText) {
    throw new Error("Text note is required");
  }

  return {
    sourceChannel: "pwa",
    contentType: "text",
    rawText,
    extractedFieldsJson: {},
    reviewStatus: "pending_review",
    occurredAt: input.occurredAt,
    capturedAt: input.capturedAt ?? new Date(),
    createdByUserId: input.createdByUserId,
  };
}

type Db = PostgresJsDatabase<typeof import("@/server/db/schema")>;

export async function createTextCapture(db: Db, input: TextCaptureInput) {
  const [event] = await db
    .insert(events)
    .values(buildTextCaptureEvent(input))
    .returning();

  return event;
}
