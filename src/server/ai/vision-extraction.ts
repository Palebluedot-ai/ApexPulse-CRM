import type { ReviewNaturalFields } from "@/lib/review-form";

export interface VisionExtractionResult {
  summary: string;
  naturalFields: ReviewNaturalFields;
  contactFields: {
    phone: string;
    email: string;
    telegram: string;
    wechatAlias: string;
  };
  crmHints: {
    actionRequired: boolean;
    confidence: "high" | "medium" | "low" | "unknown";
    evidenceNotes: string;
    leadQuality: "hot" | "warm" | "cold" | "not_a_lead" | "unknown";
  };
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

function stringFieldFromAliases(
  record: JsonRecord,
  aliases: string[],
): string {
  for (const alias of aliases) {
    const value = stringField(record[alias]);
    if (value) return value;
  }

  return "";
}

function booleanField(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return false;

  return ["true", "yes", "需要", "是"].includes(value.trim().toLowerCase());
}

function enumField<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  fallback: T[number],
): T[number] {
  const normalized = stringField(value);
  return allowed.includes(normalized) ? normalized : fallback;
}

function explicitFollowupDate(value: unknown): string {
  const normalized = stringField(value);
  if (!normalized) return "";

  const hasIsoLikeDate = /\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}/.test(
    normalized,
  );
  const hasChineseMonthDay = /\d{1,2}月\d{1,2}[日号]?/.test(normalized);

  return hasIsoLikeDate || hasChineseMonthDay ? normalized : "";
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
      customerName: stringFieldFromAliases(record, [
        "customerName",
        "counterpartyName",
      ]),
      companyName: stringField(record.companyName),
      sourceTag: stringField(record.sourceTag),
      needSummary: stringField(record.needSummary),
      nextAction: stringField(record.nextAction),
      nextFollowupAt: explicitFollowupDate(record.nextFollowupAt),
    },
    contactFields: {
      phone: stringField(record.phone),
      email: stringField(record.email),
      telegram: stringField(record.telegram),
      wechatAlias: stringField(record.wechatAlias),
    },
    crmHints: {
      actionRequired: booleanField(record.actionRequired),
      confidence: enumField(
        record.confidence,
        ["high", "medium", "low", "unknown"] as const,
        "unknown",
      ),
      evidenceNotes: stringField(record.evidenceNotes),
      leadQuality: enumField(
        record.leadQuality,
        ["hot", "warm", "cold", "not_a_lead", "unknown"] as const,
        "unknown",
      ),
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

  for (const [key, value] of Object.entries(result.contactFields)) {
    const normalized = value.trim();
    if (normalized) fields[key] = normalized;
  }

  if (result.crmHints.actionRequired) fields.actionRequired = true;
  if (result.crmHints.confidence !== "unknown") {
    fields.confidence = result.crmHints.confidence;
  }
  if (result.crmHints.leadQuality !== "unknown") {
    fields.leadQuality = result.crmHints.leadQuality;
  }
  if (result.crmHints.evidenceNotes) {
    fields.evidenceNotes = result.crmHints.evidenceNotes;
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
    "你是 OTC CRM 的中文微信聊天截图和名片信息提取助手。",
    "只输出 JSON object，不要 markdown，不要解释。",
    "不要编造图片里没有的信息；看不清或没有就输出空字符串。",
    "字段必须是：summary, counterpartyName, customerName, companyName, sourceTag, needSummary, nextAction, nextFollowupAt, phone, email, telegram, wechatAlias, leadQuality, confidence, actionRequired, evidenceNotes。",
    "counterpartyName/customerName 写截图顶部或聊天对象显示的对方；如果只看到微信昵称就写昵称。",
    "不要把我方自我介绍、HashKey OTC、James、杨超或右侧我方消息当成对方客户名。",
    "companyName 只有明确属于对方时才填；不能把 HashKey、群名、我方公司、群聊标题误当成对方公司。",
    "summary 用一句中文说明这张图对销售跟进有什么价值，最多 80 字。",
    "needSummary 只写对方明确表达的需求、兴趣或问题。",
    "nextAction 写我方下一步该做什么；没有就空字符串。",
    "nextFollowupAt 只有截图里有明确日期或日期时间才填；下周、周一、改天、之后聊这类相对时间不要硬推具体日期。",
    "phone, email, telegram, wechatAlias 只提取截图中明确出现的联系方式。",
    "leadQuality 只能是 hot, warm, cold, not_a_lead, unknown；只有明确开户、交易、报价、会议、资料交换才 warm 或 hot。",
    "confidence 只能是 high, medium, low；不要输出数字。",
    "actionRequired 表示是否需要我方继续动作，必须是 boolean。",
    "evidenceNotes 简短说明依据，不要逐字抄完整聊天。",
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
