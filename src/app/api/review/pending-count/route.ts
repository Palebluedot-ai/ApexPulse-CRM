import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/server/auth/current-user";
import { listPendingReviewItems } from "@/server/review/review-queue";
import { createDb } from "@/server/db";

export async function GET() {
  const { client, db } = createDb();

  try {
    const currentUser = await requireCurrentUser(db);
    const items = await listPendingReviewItems(db, currentUser.id, 100);
    return NextResponse.json({ count: items.length });
  } finally {
    await client.end();
  }
}
