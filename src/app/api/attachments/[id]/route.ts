import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { readImageEvidence } from "@/server/capture/image-storage-provider";
import { createDb } from "@/server/db";
import { attachments } from "@/server/db/schema";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { client, db } = createDb();

  try {
    const [attachment] = await db
      .select()
      .from(attachments)
      .where(eq(attachments.id, id))
      .limit(1);

    if (!attachment) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 },
      );
    }

    const bytes = await readImageEvidence(attachment.storageKey);

    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Disposition": `inline; filename="${encodeURIComponent(
          attachment.fileName,
        )}"`,
        "Content-Type": attachment.mimeType,
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Invalid local storage key" ||
        error.message === "Unsupported attachment storage key")
    ) {
      return NextResponse.json(
        { error: "Attachment file is not available in configured storage" },
        { status: 404 },
      );
    }

    throw error;
  } finally {
    await client.end();
  }
}
