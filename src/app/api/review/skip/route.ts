import { NextResponse } from "next/server";
import {
  isUnauthorizedError,
  requireCurrentUser,
} from "@/server/auth/current-user";
import { createDb } from "@/server/db";
import { skipReviewEvent } from "@/server/review/review-queue";

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const { client, db } = createDb();

  try {
    const currentUser = await requireCurrentUser(db);
    const event = await skipReviewEvent(db, {
      eventId: typeof body.eventId === "string" ? body.eventId : "",
      reviewedByUserId: currentUser.id,
      currentUserId: currentUser.id,
    });

    return NextResponse.json({ event });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (error instanceof Error) {
      const badRequestMessages = new Set([
        "Event id is required",
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
