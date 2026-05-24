import { describe, expect, it } from "vitest";
import { buildImageCaptureRows } from "./image-capture";

describe("image capture", () => {
  it("creates a pending review image event and first-class attachment row", () => {
    const capturedAt = new Date("2026-05-24T21:05:00+08:00");

    expect(
      buildImageCaptureRows({
        storageKey: "uploads/demo-screenshot.png",
        fileName: "demo-screenshot.png",
        mimeType: "image/png",
        fileSize: 180_000,
        width: 1170,
        height: 2532,
        note: "这是今天跟刘总的微信截图",
        capturedAt,
      }),
    ).toEqual({
      event: {
        sourceChannel: "pwa",
        contentType: "image",
        rawText: "这是今天跟刘总的微信截图",
        extractedFieldsJson: {},
        reviewStatus: "pending_review",
        capturedAt,
      },
      attachment: {
        storageKey: "uploads/demo-screenshot.png",
        fileName: "demo-screenshot.png",
        mimeType: "image/png",
        fileSize: 180_000,
        width: 1170,
        height: 2532,
      },
    });
  });

  it("rejects non-image mime types before touching the database", () => {
    expect(() =>
      buildImageCaptureRows({
        storageKey: "uploads/not-image.pdf",
        fileName: "not-image.pdf",
        mimeType: "application/pdf",
        fileSize: 10_000,
      }),
    ).toThrow("Image mime type is required");
  });

  it("requires a storage key and positive file size", () => {
    expect(() =>
      buildImageCaptureRows({
        storageKey: "",
        fileName: "demo.png",
        mimeType: "image/png",
        fileSize: 1,
      }),
    ).toThrow("Storage key is required");

    expect(() =>
      buildImageCaptureRows({
        storageKey: "uploads/demo.png",
        fileName: "demo.png",
        mimeType: "image/png",
        fileSize: 0,
      }),
    ).toThrow("Positive file size is required");
  });
});
