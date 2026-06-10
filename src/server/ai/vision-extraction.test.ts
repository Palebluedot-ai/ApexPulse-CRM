import { describe, expect, it } from "vitest";
import {
  buildVisionExtractionFields,
  buildVisionExtractionPrompt,
  extractProviderText,
  parseVisionExtractionText,
} from "./vision-extraction";

describe("vision extraction helpers", () => {
  it("parses a JSON extraction into review-first natural fields", () => {
    expect(
      parseVisionExtractionText(`{
        "summary": "客户想了解 OTC 费率。",
        "counterpartyName": "刘总",
        "companyName": "Demo Capital",
        "sourceTag": "Token2049",
        "needSummary": "想了解 OTC 费率和出入金流程",
        "nextAction": "下周发报价",
        "nextFollowupAt": "2026-06-01 09:00",
        "phone": "13424285333",
        "email": "demo@example.com",
        "telegram": "@demo",
        "wechatAlias": "demo_wechat",
        "leadQuality": "warm",
        "confidence": "high",
        "actionRequired": true,
        "evidenceNotes": "截图里明确询问费率。"
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
      contactFields: {
        phone: "13424285333",
        email: "demo@example.com",
        telegram: "@demo",
        wechatAlias: "demo_wechat",
      },
      crmHints: {
        actionRequired: true,
        confidence: "high",
        evidenceNotes: "截图里明确询问费率。",
        leadQuality: "warm",
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
  });

  it("drops vague follow-up dates instead of inventing a concrete date", () => {
    expect(
      parseVisionExtractionText(`{
        "summary": "约下周再聊。",
        "customerName": "王总",
        "nextAction": "下周再联系确认时间",
        "nextFollowupAt": "下周一"
      }`).naturalFields,
    ).toMatchObject({
      customerName: "王总",
      nextAction: "下周再联系确认时间",
      nextFollowupAt: "",
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
        contactFields: {
          phone: "13424285333",
          email: "",
          telegram: "",
          wechatAlias: "",
        },
        crmHints: {
          actionRequired: false,
          confidence: "high",
          evidenceNotes: "截图里问了 OTC 费率。",
          leadQuality: "warm",
        },
      }),
    ).toEqual({
      customerName: "刘总",
      sourceTag: "展会",
      needSummary: "客户问费率。",
      phone: "13424285333",
      leadQuality: "warm",
      confidence: "high",
      evidenceNotes: "截图里问了 OTC 费率。",
      aiExtractionSource: "vision_api",
    });
  });

  it("documents the stricter CRM extraction rules in the prompt", () => {
    const prompt = buildVisionExtractionPrompt();

    expect(prompt).toContain("companyName 只有明确属于对方");
    expect(prompt).toContain("不能把 ApexPulse、群名、我方公司");
    expect(prompt).toContain("nextFollowupAt 只有截图里有明确日期");
    expect(prompt).toContain("actionRequired");
    expect(prompt).toContain("phone, email, telegram, wechatAlias");
    expect(prompt).toContain("confidence 只能是 high, medium, low");
    expect(prompt).toContain("不要把我方自我介绍");
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

describe("text extraction helpers", () => {
  it("builds a text-only chat completion request with the note inline", async () => {
    const { buildTextExtractionRequest } = await import("./vision-extraction");
    const request = buildTextExtractionRequest({
      model: "test-model",
      rawText: "和刘总聊了开户，下周二发资料",
    });

    expect(request.model).toBe("test-model");
    expect(request.messages).toHaveLength(1);
    expect(request.messages[0].role).toBe("user");
    expect(request.messages[0].content).toContain("和刘总聊了开户");
    expect(request.messages[0].content).toContain("备注原文");
    expect(request.response_format).toEqual({ type: "json_object" });
  });

  it("keeps the same field schema in the text prompt", async () => {
    const { buildTextExtractionPrompt } = await import("./vision-extraction");
    const prompt = buildTextExtractionPrompt();

    expect(prompt).toContain("summary, counterpartyName, customerName");
    expect(prompt).toContain("leadQuality 只能是 hot, warm, cold");
    expect(prompt).toContain("不要把我方自我介绍");
    expect(prompt).toContain("备注");
  });

  it("tags extraction source when building fields", () => {
    const extraction = parseVisionExtractionText(
      JSON.stringify({ summary: "客户要报价。", customerName: "刘总" }),
    );

    expect(buildVisionExtractionFields(extraction).aiExtractionSource).toBe(
      "vision_api",
    );
    expect(
      buildVisionExtractionFields(extraction, "text_api").aiExtractionSource,
    ).toBe("text_api");
  });
});
