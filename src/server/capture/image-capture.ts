import { and, desc, eq, gt } from "drizzle-orm";
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

// 手机上传慢,双击/重复提交会把同一张截图建成两条待确认记录。
// 同一用户、同名同大小的文件在这个窗口内只算一次。
export const IMAGE_DUPLICATE_WINDOW_MS = 2 * 60 * 1000;

export interface RecentImageUploadCandidate {
  fileName: string;
  fileSize: number;
  createdByUserId: string | null;
  capturedAt: Date;
}

export interface ImageDuplicateInput {
  fileName: string;
  fileSize: number;
  createdByUserId?: string;
}

export function matchesRecentImageDuplicate(
  candidate: RecentImageUploadCandidate,
  input: ImageDuplicateInput,
  now: Date,
): boolean {
  if (candidate.fileName !== input.fileName) return false;
  if (candidate.fileSize !== input.fileSize) return false;
  if (!candidate.createdByUserId || !input.createdByUserId) return false;
  if (candidate.createdByUserId !== input.createdByUserId) return false;

  const age = now.getTime() - candidate.capturedAt.getTime();
  return age >= 0 && age <= IMAGE_DUPLICATE_WINDOW_MS;
}

export async function findRecentDuplicateImageCapture(
  db: Db,
  input: ImageDuplicateInput,
  now = new Date(),
) {
  if (!input.createdByUserId) return null;

  const windowStart = new Date(now.getTime() - IMAGE_DUPLICATE_WINDOW_MS);
  const rows = await db
    .select({ event: events, attachment: attachments })
    .from(attachments)
    .innerJoin(events, eq(events.id, attachments.eventId))
    .where(
      and(
        eq(attachments.fileName, input.fileName),
        eq(attachments.fileSize, input.fileSize),
        eq(events.createdByUserId, input.createdByUserId),
        eq(events.reviewStatus, "pending_review"),
        gt(events.capturedAt, windowStart),
      ),
    )
    .orderBy(desc(events.capturedAt))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return matchesRecentImageDuplicate(
    {
      fileName: row.attachment.fileName,
      fileSize: row.attachment.fileSize,
      createdByUserId: row.event.createdByUserId,
      capturedAt: row.event.capturedAt,
    },
    input,
    now,
  )
    ? row
    : null;
}

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
