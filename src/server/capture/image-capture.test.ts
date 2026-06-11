import { describe, expect, it } from "vitest";
import {
  buildImageCaptureRows,
  matchesRecentImageDuplicate,
} from "./image-capture";

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

describe("matchesRecentImageDuplicate", () => {
  const now = new Date("2026-06-11T14:53:10+08:00");
  const input = {
    fileName: "IMG_4134.png",
    fileSize: 470_074,
    createdByUserId: "user-1",
  };

  function buildCandidate(overrides: Record<string, unknown> = {}) {
    return {
      fileName: "IMG_4134.png",
      fileSize: 470_074,
      createdByUserId: "user-1",
      capturedAt: new Date("2026-06-11T14:53:09+08:00"),
      ...overrides,
    };
  }

  it("treats the same file from the same user seconds ago as a duplicate", () => {
    expect(matchesRecentImageDuplicate(buildCandidate(), input, now)).toBe(
      true,
    );
  });

  it("allows re-uploading the same file outside the dedupe window", () => {
    expect(
      matchesRecentImageDuplicate(
        buildCandidate({ capturedAt: new Date("2026-06-11T14:48:00+08:00") }),
        input,
        now,
      ),
    ).toBe(false);
  });

  it("does not dedupe different files of the same size", () => {
    expect(
      matchesRecentImageDuplicate(
        buildCandidate({ fileName: "IMG_4135.png" }),
        input,
        now,
      ),
    ).toBe(false);
  });

  it("does not dedupe the same file name with different content size", () => {
    expect(
      matchesRecentImageDuplicate(
        buildCandidate({ fileSize: 470_075 }),
        input,
        now,
      ),
    ).toBe(false);
  });

  it("does not dedupe uploads from a different user", () => {
    expect(
      matchesRecentImageDuplicate(
        buildCandidate({ createdByUserId: "user-2" }),
        input,
        now,
      ),
    ).toBe(false);
  });
});
