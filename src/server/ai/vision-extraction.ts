import type { ReviewNaturalFields } from "@/lib/review-form";

export interface VisionExtractionResult {
  summary: string;
  naturalFields: ReviewNaturalFields;
}

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | undefined {
  return typeof value === "object" && value != null && !Array.isArray(value)
    ? (value as JsonRecord)
    : undefined;
}

function stringField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stripMarkdownFence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : trimmed;
}

export function parseVisionExtractionText(text: string): VisionExtractionResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripMarkdownFence(text)) as unknown;
  } catch {
    throw new Error("Vision extraction output must be valid JSON");
  }

  const record = asRecord(parsed);

  if (!record) {
    throw new Error("Vision extraction output must be a JSON object");
  }

  return {
    summary: stringField(record.summary),
    naturalFields: {
      customerName: stringField(record.customerName),
      companyName: stringField(record.companyName),
      sourceTag: stringField(record.sourceTag),
      needSummary: stringField(record.needSummary),
      nextAction: stringField(record.nextAction),
      nextFollowupAt: stringField(record.nextFollowupAt),
    },
  };
}

export function buildVisionExtractionFields(
  result: VisionExtractionResult,
): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    aiExtractionSource: "vision_api",
  };

  for (const [key, value] of Object.entries(result.naturalFields)) {
    const normalized = value.trim();
    if (normalized) fields[key] = normalized;
  }

  return fields;
}

function firstStringContent(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";

  for (const item of value) {
    const record = asRecord(item);
    const text = stringField(record?.text);
    if (text) return text;
  }

  return "";
}

export function extractProviderText(payload: unknown): string {
  const record = asRecord(payload);
  const choices = Array.isArray(record?.choices) ? record.choices : [];
  const firstChoice = asRecord(choices[0]);
  const message = asRecord(firstChoice?.message);
  const chatText = firstStringContent(message?.content);

  if (chatText) return chatText;

  const output = Array.isArray(record?.output) ? record.output : [];

  for (const outputItem of output) {
    const outputRecord = asRecord(outputItem);
    const content = Array.isArray(outputRecord?.content)
      ? outputRecord.content
      : [];

    for (const contentItem of content) {
      const contentRecord = asRecord(contentItem);
      const text = stringField(contentRecord?.text);
      if (text) return text;
    }
  }

  throw new Error("Vision provider response did not include text output");
}

export function buildVisionExtractionPrompt(): string {
  return [
    "你是 OTC CRM 的截图和名片信息提取助手。",
    "只输出 JSON object，不要 markdown，不要解释。",
    "不要编造图片里没有的信息；看不清或没有就输出空字符串。",
    "字段必须是：summary, customerName, companyName, sourceTag, needSummary, nextAction, nextFollowupAt。",
    "summary 用一句中文说明这张图对销售跟进有什么价值。",
    "nextFollowupAt 如果图片里没有明确日期时间，输出空字符串。",
  ].join("\n");
}

export function buildVisionExtractionRequest(input: {
  model: string;
  imageBytes: Buffer;
  mimeType: string;
  note?: string | null;
}) {
  const note = input.note?.trim();
  const prompt = note
    ? `${buildVisionExtractionPrompt()}\n\n用户补充备注：${note}`
    : buildVisionExtractionPrompt();

  return {
    model: input.model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: `data:${input.mimeType};base64,${input.imageBytes.toString(
                "base64",
              )}`,
            },
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
  };
}
