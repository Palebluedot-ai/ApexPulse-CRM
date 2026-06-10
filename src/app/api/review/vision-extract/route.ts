import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  isUnauthorizedError,
  requireCurrentUser,
} from "@/server/auth/current-user";
import { createDb } from "@/server/db";
import { attachments, events } from "@/server/db/schema";
import {
  buildVisionProviderConfig,
  extractImageWithVisionProvider,
  extractTextWithVisionProvider,
} from "@/server/ai/vision-provider";
import { buildReviewAiFields, buildReviewNaturalFields } from "@/lib/review-form";
import { editReviewEvent } from "@/server/review/review-queue";
import { readExtractableImageEvidence } from "@/server/review/vision-extract-evidence";
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

    let extraction;
    let extractionSource: "vision_api" | "text_api";

    if (row.event.contentType === "image") {
      const { imageBytes, mimeType } = await readExtractableImageEvidence(
        row.attachment,
      );
      extraction = await extractImageWithVisionProvider({
        config: buildVisionProviderConfig(),
        imageBytes,
        mimeType,
        note: row.event.rawText,
      });
      extractionSource = "vision_api";
    } else {
      const rawText = row.event.rawText?.trim();

      if (!rawText) {
        throw new Error("Text note is required");
      }

      extraction = await extractTextWithVisionProvider({
        config: buildVisionProviderConfig(),
        rawText,
      });
      extractionSource = "text_api";
    }

    const patch = buildVisionReviewPatch({
      currentSummary: row.event.aiSummary,
      rawText: row.event.rawText,
      existingFields: row.event.extractedFieldsJson,
      extraction,
      extractionSource,
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
      aiFields: buildReviewAiFields(event.extractedFieldsJson),
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
        "Image attachment is required",
        "Image attachment must have an image MIME type",
        "Unsupported attachment storage key",
        "Text note is required",
        "Invalid local storage key",
        "SUPABASE_URL is required",
        "SUPABASE_SERVICE_ROLE_KEY is required",
        "SUPABASE_STORAGE_BUCKET is required",
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
