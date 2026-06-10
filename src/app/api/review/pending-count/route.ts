import { NextResponse } from "next/server";
import { listPendingReviewItems } from "@/server/review/review-queue";
import { createDb } from "@/server/db";

export async function GET() {
  const { client, db } = createDb();

  try {
    const items = await listPendingReviewItems(db, 100);
    return NextResponse.json({ count: items.length });
  } finally {
    await client.end();
  }
}
