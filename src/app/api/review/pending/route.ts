import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/server/auth/current-user";
import { buildReviewQueueViewItems } from "@/server/review/review-page-model";
import { listPendingReviewItems } from "@/server/review/review-queue";
import { createDb } from "@/server/db";

function limitFromUrl(url: string): number {
  const value = new URL(url).searchParams.get("limit");
  if (!value) return 50;

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 100) : 50;
}

export async function GET(request: Request) {
  const { client, db } = createDb();

  try {
    const currentUser = await requireCurrentUser(db);
    const items = await listPendingReviewItems(
      db,
      currentUser.id,
      limitFromUrl(request.url),
    );
    return NextResponse.json({
      items,
      viewItems: buildReviewQueueViewItems(items),
    });
  } finally {
    await client.end();
  }
}
