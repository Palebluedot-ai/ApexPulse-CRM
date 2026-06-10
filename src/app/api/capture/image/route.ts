import { after, NextResponse } from "next/server";
import {
  isUnauthorizedError,
  requireCurrentUser,
} from "@/server/auth/current-user";
import { runCaptureAutoExtraction } from "@/server/capture/auto-extract";
import { createImageCapture } from "@/server/capture/image-capture";
import { saveImageEvidence } from "@/server/capture/image-storage-provider";
import { createDb } from "@/server/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { client, db } = createDb();

  try {
    const currentUser = await requireCurrentUser(db);
    const form = await request.formData();
    const imageFile = form.get("imageFile");

    if (!(imageFile instanceof File) || !imageFile.name) {
      throw new Error("Image file is required");
    }

    const bytes = Buffer.from(await imageFile.arrayBuffer());
    const storagePlan = await saveImageEvidence({
      fileName: imageFile.name,
      mimeType: imageFile.type,
      fileSize: imageFile.size,
      bytes,
    });

    const result = await createImageCapture(db, {
      storageKey: storagePlan.storageKey,
      fileName: storagePlan.fileName,
      mimeType: storagePlan.mimeType,
      fileSize: storagePlan.fileSize,
      note:
        typeof form.get("note") === "string"
          ? String(form.get("note"))
          : undefined,
      createdByUserId: currentUser.id,
    });

    after(() => runCaptureAutoExtraction(result.event.id));

    return NextResponse.json(
      {
        eventId: result.event.id,
        attachmentId: result.attachment.id,
        reviewStatus: result.event.reviewStatus,
      },
      { status: 201 },
    );
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

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
  } finally {
    await client.end();
  }
}
