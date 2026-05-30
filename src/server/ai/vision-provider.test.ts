import { describe, expect, it, vi } from "vitest";
import {
  buildVisionProviderConfig,
  extractImageWithVisionProvider,
} from "./vision-provider";

describe("vision provider", () => {
  it("builds config from explicit environment values", () => {
    expect(
      buildVisionProviderConfig({
        VISION_API_KEY: "test-key",
        VISION_API_BASE_URL: "https://example.test/v1",
        VISION_API_MODEL: "vision-model",
      }),
    ).toEqual({
      apiKey: "test-key",
      baseUrl: "https://example.test/v1",
      model: "vision-model",
    });
  });

  it("rejects missing API key before any external call", () => {
    expect(() =>
      buildVisionProviderConfig({
        VISION_API_BASE_URL: "https://example.test/v1",
        VISION_API_MODEL: "vision-model",
      }),
    ).toThrow("VISION_API_KEY is required");
  });

  it("calls an OpenAI-compatible chat completions endpoint and parses output", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content:
                  '{"summary":"客户问 OTC 费率。","customerName":"刘总","needSummary":"想了解费率"}',
              },
            },
          ],
        }),
        { status: 200 },
      );
    });

    const result = await extractImageWithVisionProvider({
      config: {
        apiKey: "test-key",
        baseUrl: "https://example.test/v1",
        model: "vision-model",
      },
      imageBytes: Buffer.from("demo-image"),
      mimeType: "image/png",
      note: "展会截图",
      fetchImpl: fetchMock,
    });

    expect(result).toEqual({
      summary: "客户问 OTC 费率。",
      naturalFields: {
        customerName: "刘总",
        companyName: "",
        sourceTag: "",
        needSummary: "想了解费率",
        nextAction: "",
        nextFollowupAt: "",
      },
      contactFields: {
        phone: "",
        email: "",
        telegram: "",
        wechatAlias: "",
      },
      crmHints: {
        actionRequired: false,
        confidence: "unknown",
        evidenceNotes: "",
        leadQuality: "unknown",
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.test/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer test-key",
          "Content-Type": "application/json",
        },
      }),
    );
  });

  it("surfaces provider failures without returning partial fields", async () => {
    await expect(
      extractImageWithVisionProvider({
        config: {
          apiKey: "test-key",
          baseUrl: "https://example.test/v1",
          model: "vision-model",
        },
        imageBytes: Buffer.from("demo-image"),
        mimeType: "image/png",
        fetchImpl: async () =>
          new Response(JSON.stringify({ error: "bad request" }), {
            status: 400,
          }),
      }),
    ).rejects.toThrow("Vision provider request failed: 400");
  });
});
