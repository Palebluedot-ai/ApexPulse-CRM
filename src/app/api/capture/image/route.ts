import { NextResponse } from "next/server";
import { createImageCapture } from "@/server/capture/image-capture";
import { createDb } from "@/server/db";

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;

  const { client, db } = createDb();

  try {
    const result = await createImageCapture(db, {
      storageKey: typeof body.storageKey === "string" ? body.storageKey : "",
      fileName: typeof body.fileName === "string" ? body.fileName : "",
      mimeType: typeof body.mimeType === "string" ? body.mimeType : "",
      fileSize: typeof body.fileSize === "number" ? body.fileSize : 0,
      width: numberOrUndefined(body.width),
      height: numberOrUndefined(body.height),
      note: typeof body.note === "string" ? body.note : undefined,
    });

    return NextResponse.json(
      {
        eventId: result.event.id,
        attachmentId: result.attachment.id,
        reviewStatus: result.event.reviewStatus,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error) {
      const badRequestMessages = new Set([
        "Storage key is required",
        "File name is required",
        "Image mime type is required",
        "Positive file size is required",
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
