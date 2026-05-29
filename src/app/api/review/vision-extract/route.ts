import { readFile } from "node:fs/promises";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  isUnauthorizedError,
  requireCurrentUser,
} from "@/server/auth/current-user";
import { localAttachmentPath } from "@/server/capture/local-image-storage";
import { createDb } from "@/server/db";
import { attachments, events } from "@/server/db/schema";
import {
  buildVisionProviderConfig,
  extractImageWithVisionProvider,
} from "@/server/ai/vision-provider";
import { buildReviewNaturalFields } from "@/lib/review-form";
import { editReviewEvent } from "@/server/review/review-queue";
import { buildVisionReviewPatch } from "@/server/review/vision-review";

export const runtime = "nodejs";

function requireEventId(value: unknown): string {
  const eventId = typeof value === "string" ? value.trim() : "";
  if (!eventId) throw new Error("Event id is required");
  return eventId;
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const eventId = requireEventId(body.eventId);
  const { client, db } = createDb();

  try {
    await requireCurrentUser(db);

    const [row] = await db
      .select({
        event: events,
        attachment: attachments,
      })
      .from(events)
      .leftJoin(attachments, eq(attachments.eventId, events.id))
      .where(
        and(
          eq(events.id, eventId),
          eq(events.reviewStatus, "pending_review"),
        ),
      );

    if (!row?.event) throw new Error("Pending review event not found");

    const attachment = row.attachment;
    const canExtract =
      attachment?.storageKey.startsWith("local-images/") &&
      attachment.mimeType.startsWith("image/");

    if (!attachment || !canExtract) {
      throw new Error("Local image attachment is required");
    }

    const imageBytes = await readFile(localAttachmentPath(attachment.storageKey));
    const extraction = await extractImageWithVisionProvider({
      config: buildVisionProviderConfig(),
      imageBytes,
      mimeType: attachment.mimeType,
      note: row.event.rawText,
    });
    const patch = buildVisionReviewPatch({
      currentSummary: row.event.aiSummary,
      rawText: row.event.rawText,
      existingFields: row.event.extractedFieldsJson,
      extraction,
    });
    const event = await editReviewEvent(db, {
      eventId,
      summary: patch.summary,
      extractedFields: patch.extractedFields,
    });

    return NextResponse.json({
      eventId: event.id,
      summary: event.aiSummary,
      extractedFields: event.extractedFieldsJson,
      naturalFields: buildReviewNaturalFields(event.extractedFieldsJson),
      reviewStatus: event.reviewStatus,
    });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (error instanceof Error) {
      const badRequestMessages = new Set([
        "Event id is required",
        "Pending review event not found",
        "Local image attachment is required",
        "Invalid local storage key",
        "VISION_API_KEY is required",
        "VISION_API_BASE_URL is required",
        "VISION_API_MODEL is required",
      ]);

      if (badRequestMessages.has(error.message)) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      if (
        error.message.startsWith("Vision provider request failed") ||
        error.message.startsWith("Vision provider response did not include") ||
        error.message.startsWith("Vision extraction output")
      ) {
        return NextResponse.json({ error: error.message }, { status: 502 });
      }
    }

    throw error;
  } finally {
    await client.end();
  }
}
