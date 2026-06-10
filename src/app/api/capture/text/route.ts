import { after, NextResponse } from "next/server";
import {
  isUnauthorizedError,
  requireCurrentUser,
} from "@/server/auth/current-user";
import { runCaptureAutoExtraction } from "@/server/capture/auto-extract";
import { createDb } from "@/server/db";
import { createTextCapture } from "@/server/capture/text-capture";

function parseOptionalDate(value: unknown): Date | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date");
  }
  return date;
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    rawText?: unknown;
    occurredAt?: unknown;
  };

  if (typeof body.rawText !== "string") {
    return NextResponse.json({ error: "raw_text_required" }, { status: 400 });
  }

  const { client, db } = createDb();

  try {
    const currentUser = await requireCurrentUser(db);
    const event = await createTextCapture(db, {
      rawText: body.rawText,
      occurredAt: parseOptionalDate(body.occurredAt),
      createdByUserId: currentUser.id,
    });

    after(() => runCaptureAutoExtraction(event.id));

    return NextResponse.json(
      {
        id: event.id,
        reviewStatus: event.reviewStatus,
      },
      { status: 201 },
    );
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "Text note is required") {
      return NextResponse.json({ error: "raw_text_required" }, { status: 400 });
    }

    if (error instanceof Error && error.message === "Invalid date") {
      return NextResponse.json({ error: "invalid_occurred_at" }, { status: 400 });
    }

    throw error;
  } finally {
    await client.end();
  }
}
