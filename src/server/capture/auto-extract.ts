import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import {
  buildVisionProviderConfig,
  extractImageWithVisionProvider,
  extractTextWithVisionProvider,
} from "@/server/ai/vision-provider";
import { localAttachmentPath } from "@/server/capture/local-image-storage";
import { createDb } from "@/server/db";
import { attachments, events, type Attachment, type Event } from "@/server/db/schema";
import { editReviewEvent } from "@/server/review/review-queue";
import { buildVisionReviewPatch } from "@/server/review/vision-review";

export function shouldAutoExtract(event: {
  reviewStatus: string;
  extractedFieldsJson: Record<string, unknown>;
}): boolean {
  if (event.reviewStatus !== "pending_review") return false;
  return !event.extractedFieldsJson.aiExtractionSource;
}

async function runExtraction(event: Event, attachment: Attachment | null) {
  const config = buildVisionProviderConfig();

  if (event.contentType === "image") {
    if (
      !attachment ||
      !attachment.storageKey.startsWith("local-images/") ||
      !attachment.mimeType.startsWith("image/")
    ) {
      return null;
    }

    const imageBytes = await readFile(localAttachmentPath(attachment.storageKey));
    const extraction = await extractImageWithVisionProvider({
      config,
      imageBytes,
      mimeType: attachment.mimeType,
      note: event.rawText,
    });

    return { extraction, source: "vision_api" as const };
  }

  const rawText = event.rawText?.trim();
  if (!rawText) return null;

  const extraction = await extractTextWithVisionProvider({ config, rawText });
  return { extraction, source: "text_api" as const };
}

/**
 * Fire-and-forget extraction after capture. Never throws: capture must
 * succeed even when the AI provider is down or unconfigured.
 */
export async function runCaptureAutoExtraction(eventId: string): Promise<void> {
  const { client, db } = createDb();

  try {
    const [row] = await db
      .select({ event: events, attachment: attachments })
      .from(events)
      .leftJoin(attachments, eq(attachments.eventId, events.id))
      .where(eq(events.id, eventId));

    if (!row?.event || !shouldAutoExtract(row.event)) return;

    const result = await runExtraction(row.event, row.attachment);
    if (!result) return;

    const patch = buildVisionReviewPatch({
      currentSummary: row.event.aiSummary,
      rawText: row.event.rawText,
      existingFields: row.event.extractedFieldsJson,
      extraction: result.extraction,
      extractionSource: result.source,
    });

    await editReviewEvent(db, {
      eventId,
      summary: patch.summary,
      extractedFields: patch.extractedFields,
    });
  } catch (error) {
    console.error(
      `[auto-extract] event ${eventId} failed:`,
      error instanceof Error ? error.message : error,
    );
  } finally {
    await client.end();
  }
}
