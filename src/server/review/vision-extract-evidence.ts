import { readImageEvidence } from "@/server/capture/image-storage-provider";

interface ImageAttachment {
  storageKey: string;
  mimeType: string;
}

type ReadImageEvidence = (storageKey: string) => Promise<Buffer>;

export async function readExtractableImageEvidence(
  attachment: ImageAttachment | null | undefined,
  readEvidence: ReadImageEvidence = readImageEvidence,
): Promise<{ imageBytes: Buffer; mimeType: string }> {
  if (!attachment) throw new Error("Image attachment is required");

  if (!attachment.mimeType.startsWith("image/")) {
    throw new Error("Image attachment must have an image MIME type");
  }

  return {
    imageBytes: await readEvidence(attachment.storageKey),
    mimeType: attachment.mimeType,
  };
}
