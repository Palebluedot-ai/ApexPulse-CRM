import { describe, expect, it } from "vitest";
import {
  buildVisionExtractionFields,
  extractProviderText,
  parseVisionExtractionText,
} from "./vision-extraction";

describe("vision extraction helpers", () => {
  it("parses a JSON extraction into review-first natural fields", () => {
    expect(
      parseVisionExtractionText(`{
        "summary": "客户想了解 OTC 费率。",
        "customerName": "刘总",
        "companyName": "Demo Capital",
        "sourceTag": "Token2049",
        "needSummary": "想了解 OTC 费率和出入金流程",
        "nextAction": "下周发报价",
        "nextFollowupAt": "2026-06-01 09:00"
      }`),
    ).toEqual({
      summary: "客户想了解 OTC 费率。",
      naturalFields: {
        customerName: "刘总",
        companyName: "Demo Capital",
        sourceTag: "Token2049",
        needSummary: "想了解 OTC 费率和出入金流程",
        nextAction: "下周发报价",
        nextFollowupAt: "2026-06-01 09:00",
      },
    });
  });

  it("accepts JSON wrapped in a markdown code fence", () => {
    expect(
      parseVisionExtractionText(`\`\`\`json
      { "summary": "名片来自 Alice。", "customerName": "Alice" }
      \`\`\``),
    ).toEqual({
      summary: "名片来自 Alice。",
      naturalFields: {
        customerName: "Alice",
        companyName: "",
        sourceTag: "",
        needSummary: "",
        nextAction: "",
        nextFollowupAt: "",
      },
    });
  });

  it("rejects non-object extraction output", () => {
    expect(() => parseVisionExtractionText("[]")).toThrow(
      "Vision extraction output must be a JSON object",
    );
  });

  it("rejects invalid JSON extraction output with a stable error", () => {
    expect(() => parseVisionExtractionText("not json")).toThrow(
      "Vision extraction output must be valid JSON",
    );
  });

  it("builds extracted fields without empty values and marks the source", () => {
    expect(
      buildVisionExtractionFields({
        summary: "客户问费率。",
        naturalFields: {
          customerName: "刘总",
          companyName: "",
          sourceTag: "展会",
          needSummary: "客户问费率。",
          nextAction: "",
          nextFollowupAt: "",
        },
      }),
    ).toEqual({
      customerName: "刘总",
      sourceTag: "展会",
      needSummary: "客户问费率。",
      aiExtractionSource: "vision_api",
    });
  });

  it("extracts text from an OpenAI-compatible chat completion response", () => {
    expect(
      extractProviderText({
        choices: [
          {
            message: {
              content: "{\"summary\":\"客户问报价。\"}",
            },
          },
        ],
      }),
    ).toBe("{\"summary\":\"客户问报价。\"}");
  });

  it("extracts text from an OpenAI responses-style output", () => {
    expect(
      extractProviderText({
        output: [
          {
            content: [
              {
                type: "output_text",
                text: "{\"summary\":\"客户问出入金。\"}",
              },
            ],
          },
        ],
      }),
    ).toBe("{\"summary\":\"客户问出入金。\"}");
  });
});
