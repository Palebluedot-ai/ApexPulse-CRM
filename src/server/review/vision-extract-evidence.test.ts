import { describe, expect, it, vi } from "vitest";
import { readExtractableImageEvidence } from "./vision-extract-evidence";

describe("readExtractableImageEvidence", () => {
  it("reads Supabase image evidence through the shared image storage provider", async () => {
    const readImageEvidence = vi.fn(async () => Buffer.from("cloud-image"));

    const result = await readExtractableImageEvidence(
      {
        storageKey: "supabase-images/2026/06/10/wechat.png",
        mimeType: "image/png",
      },
      readImageEvidence,
    );

    expect(result).toEqual({
      imageBytes: Buffer.from("cloud-image"),
      mimeType: "image/png",
    });
    expect(readImageEvidence).toHaveBeenCalledWith(
      "supabase-images/2026/06/10/wechat.png",
    );
  });

  it("keeps local image evidence supported through the same reader", async () => {
    const readImageEvidence = vi.fn(async () => Buffer.from("local-image"));

    const result = await readExtractableImageEvidence(
      {
        storageKey: "local-images/2026/06/10/wechat.png",
        mimeType: "image/png",
      },
      readImageEvidence,
    );

    expect(Buffer.from(result.imageBytes).toString("utf8")).toBe("local-image");
  });

  it("rejects missing attachments with a stable error", async () => {
    await expect(
      readExtractableImageEvidence(null, vi.fn()),
    ).rejects.toThrow("Image attachment is required");
  });

  it("rejects non-image attachments before calling the storage reader", async () => {
    const readImageEvidence = vi.fn();

    await expect(
      readExtractableImageEvidence(
        {
          storageKey: "supabase-images/2026/06/10/note.pdf",
          mimeType: "application/pdf",
        },
        readImageEvidence,
      ),
    ).rejects.toThrow("Image attachment must have an image MIME type");
    expect(readImageEvidence).not.toHaveBeenCalled();
  });

  it("lets unsupported storage key errors stay explicit", async () => {
    const readImageEvidence = vi.fn(async () => {
      throw new Error("Unsupported attachment storage key");
    });

    await expect(
      readExtractableImageEvidence(
        {
          storageKey: "unknown-images/2026/06/10/wechat.png",
          mimeType: "image/png",
        },
        readImageEvidence,
      ),
    ).rejects.toThrow("Unsupported attachment storage key");
  });
});
