import { NextResponse } from "next/server";
import { createImageCapture } from "@/server/capture/image-capture";
import {
  buildLocalImageStoragePlan,
  writeLocalAttachment,
} from "@/server/capture/local-image-storage";
import { createDb } from "@/server/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const imageFile = form.get("imageFile");

    if (!(imageFile instanceof File) || !imageFile.name) {
      throw new Error("Image file is required");
    }

    const storagePlan = buildLocalImageStoragePlan({
      fileName: imageFile.name,
      mimeType: imageFile.type,
      fileSize: imageFile.size,
    });
    const bytes = Buffer.from(await imageFile.arrayBuffer());
    await writeLocalAttachment(storagePlan.storageKey, bytes);

    const { client, db } = createDb();

    try {
      const result = await createImageCapture(db, {
        storageKey: storagePlan.storageKey,
        fileName: storagePlan.fileName,
        mimeType: storagePlan.mimeType,
        fileSize: storagePlan.fileSize,
        note:
          typeof form.get("note") === "string"
            ? String(form.get("note"))
            : undefined,
      });

      return NextResponse.json(
        {
          eventId: result.event.id,
          attachmentId: result.attachment.id,
          reviewStatus: result.event.reviewStatus,
        },
        { status: 201 },
      );
    } finally {
      await client.end();
    }
  } catch (error) {
    if (error instanceof Error) {
      const badRequestMessages = new Set([
        "Image file is required",
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
  }
}
