import { NextResponse } from "next/server";
import { createDb } from "@/server/db";
import { editReviewEvent } from "@/server/review/review-queue";

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const { client, db } = createDb();

  try {
    const event = await editReviewEvent(db, {
      eventId: typeof body.eventId === "string" ? body.eventId : "",
      summary: typeof body.summary === "string" ? body.summary : "",
      extractedFields:
        typeof body.extractedFields === "object" && body.extractedFields != null
          ? (body.extractedFields as Record<string, unknown>)
          : {},
    });

    return NextResponse.json({ event });
  } catch (error) {
    if (error instanceof Error) {
      const badRequestMessages = new Set([
        "Event id is required",
        "Review summary is required",
        "Pending review event not found",
      ]);

      if (badRequestMessages.has(error.message)) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    throw error;
  } finally {
    await client.end();
  }
}
