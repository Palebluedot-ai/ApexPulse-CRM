import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { attachments, events, type NewAttachment, type NewEvent } from "@/server/db/schema";

export interface ImageCaptureInput {
  storageKey: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
  note?: string;
  capturedAt?: Date;
  createdByUserId?: string;
}

export interface ImageCaptureRows {
  event: NewEvent;
  attachment: Omit<NewAttachment, "eventId">;
}

function optionalPositiveInteger(value: number | undefined): number | undefined {
  if (value == null) return undefined;
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

export function buildImageCaptureRows(input: ImageCaptureInput): ImageCaptureRows {
  const storageKey = input.storageKey.trim();
  const fileName = input.fileName.trim();
  const mimeType = input.mimeType.trim().toLowerCase();
  const note = input.note?.trim();

  if (!storageKey) throw new Error("Storage key is required");
  if (!fileName) throw new Error("File name is required");
  if (!mimeType.startsWith("image/")) throw new Error("Image mime type is required");
  if (!Number.isInteger(input.fileSize) || input.fileSize <= 0) {
    throw new Error("Positive file size is required");
  }

  return {
    event: {
      sourceChannel: "pwa",
      contentType: "image",
      rawText: note || null,
      extractedFieldsJson: {},
      reviewStatus: "pending_review",
      capturedAt: input.capturedAt ?? new Date(),
      createdByUserId: input.createdByUserId,
    },
    attachment: {
      storageKey,
      fileName,
      mimeType,
      fileSize: input.fileSize,
      width: optionalPositiveInteger(input.width),
      height: optionalPositiveInteger(input.height),
    },
  };
}

type Db = PostgresJsDatabase<typeof import("@/server/db/schema")>;

export async function createImageCapture(db: Db, input: ImageCaptureInput) {
  const rows = buildImageCaptureRows(input);
  const [event] = await db.insert(events).values(rows.event).returning();
  const [attachment] = await db
    .insert(attachments)
    .values({
      ...rows.attachment,
      eventId: event.id,
    })
    .returning();

  return { event, attachment };
}
