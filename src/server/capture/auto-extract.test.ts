import { describe, expect, it, vi } from "vitest";
import { runExtraction, shouldAutoExtract } from "./auto-extract";
import type { Attachment, Event } from "@/server/db/schema";

describe("shouldAutoExtract", () => {
  it("extracts pending events without prior AI extraction", () => {
    expect(
      shouldAutoExtract({
        reviewStatus: "pending_review",
        extractedFieldsJson: {},
      }),
    ).toBe(true);
  });

  it("skips events that already have an AI extraction", () => {
    expect(
      shouldAutoExtract({
        reviewStatus: "pending_review",
        extractedFieldsJson: { aiExtractionSource: "vision_api" },
      }),
    ).toBe(false);
  });

  it("skips events that are no longer pending review", () => {
    expect(
      shouldAutoExtract({
        reviewStatus: "confirmed",
        extractedFieldsJson: {},
      }),
    ).toBe(false);
  });
});

const dummyConfig = {
  apiKey: "test-key",
  baseUrl: "https://vision.example.com/v1",
  model: "test-model",
};

const extraction = { summary: "提取结果" };

function buildImageEvent(overrides: Partial<Event> = {}): Event {
  return {
    contentType: "image",
    rawText: "备注",
    ...overrides,
  } as Event;
}

function buildAttachment(overrides: Partial<Attachment> = {}): Attachment {
  return {
    storageKey: "local-images/2026/06/11/a.png",
    mimeType: "image/png",
    ...overrides,
  } as Attachment;
}

describe("runExtraction", () => {
  it("extracts supabase-images attachments through the shared evidence reader", async () => {
    const imageBytes = Buffer.from("supabase-image-bytes");
    const readEvidence = vi.fn().mockResolvedValue(imageBytes);
    const extractImage = vi.fn().mockResolvedValue(extraction);

    const result = await runExtraction(
      buildImageEvent(),
      buildAttachment({ storageKey: "supabase-images/2026/06/11/a.png" }),
      { config: dummyConfig, readEvidence, extractImage },
    );

    expect(readEvidence).toHaveBeenCalledWith(
      "supabase-images/2026/06/11/a.png",
    );
    expect(extractImage).toHaveBeenCalledWith({
      config: dummyConfig,
      imageBytes,
      mimeType: "image/png",
      note: "备注",
    });
    expect(result).toEqual({ extraction, source: "vision_api" });
  });

  it("extracts local-images attachments through the shared evidence reader", async () => {
    const imageBytes = Buffer.from("local-image-bytes");
    const readEvidence = vi.fn().mockResolvedValue(imageBytes);
    const extractImage = vi.fn().mockResolvedValue(extraction);

    const result = await runExtraction(buildImageEvent(), buildAttachment(), {
      config: dummyConfig,
      readEvidence,
      extractImage,
    });

    expect(readEvidence).toHaveBeenCalledWith("local-images/2026/06/11/a.png");
    expect(result).toEqual({ extraction, source: "vision_api" });
  });

  it("throws instead of silently skipping when an image event has no attachment", async () => {
    await expect(
      runExtraction(buildImageEvent(), null, {
        config: dummyConfig,
        readEvidence: vi.fn(),
        extractImage: vi.fn(),
      }),
    ).rejects.toThrow("Image attachment is required");
  });

  it("throws when the attachment is not an image", async () => {
    await expect(
      runExtraction(
        buildImageEvent(),
        buildAttachment({ mimeType: "application/pdf" }),
        { config: dummyConfig, readEvidence: vi.fn(), extractImage: vi.fn() },
      ),
    ).rejects.toThrow("Image attachment must have an image MIME type");
  });

  it("extracts text events from raw text", async () => {
    const extractText = vi.fn().mockResolvedValue(extraction);

    const result = await runExtraction(
      buildImageEvent({ contentType: "text", rawText: " 文字备注 " }),
      null,
      { config: dummyConfig, extractText },
    );

    expect(extractText).toHaveBeenCalledWith({
      config: dummyConfig,
      rawText: "文字备注",
    });
    expect(result).toEqual({ extraction, source: "text_api" });
  });

  it("returns null for text events without raw text", async () => {
    const result = await runExtraction(
      buildImageEvent({ contentType: "text", rawText: "   " }),
      null,
      { config: dummyConfig, extractText: vi.fn() },
    );

    expect(result).toBeNull();
  });
});
