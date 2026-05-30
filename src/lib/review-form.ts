type ParsedExtractedFields =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; message: string };

export interface ReviewNaturalFields {
  customerName: string;
  companyName: string;
  sourceTag: string;
  needSummary: string;
  nextAction: string;
  nextFollowupAt: string;
}

export interface ReviewAiFields {
  phone: string;
  email: string;
  telegram: string;
  wechatAlias: string;
  leadQuality: "hot" | "warm" | "cold" | "not_a_lead" | "unknown";
  confidence: "high" | "medium" | "low" | "unknown";
  actionRequired: boolean;
  evidenceNotes: string;
}

const emptyNaturalFields: ReviewNaturalFields = {
  customerName: "",
  companyName: "",
  sourceTag: "",
  needSummary: "",
  nextAction: "",
  nextFollowupAt: "",
};

const emptyAiFields: ReviewAiFields = {
  phone: "",
  email: "",
  telegram: "",
  wechatAlias: "",
  leadQuality: "unknown",
  confidence: "unknown",
  actionRequired: false,
  evidenceNotes: "",
};

const naturalFieldKeys = Object.keys(
  emptyNaturalFields,
) as (keyof ReviewNaturalFields)[];

const aiFieldKeys = Object.keys(emptyAiFields) as (keyof ReviewAiFields)[];

const naturalFieldAliases: Record<keyof ReviewNaturalFields, string[]> = {
  customerName: ["customerName", "displayName", "name", "clientName"],
  companyName: ["companyName", "company", "organization"],
  sourceTag: ["sourceTag", "referralSourceTag", "referral", "source"],
  needSummary: ["needSummary", "requirement", "need", "topic"],
  nextAction: ["nextAction", "nextStep", "action"],
  nextFollowupAt: ["nextFollowupAt", "nextFollowupDate", "followupAt"],
};

function stringFromUnknown(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function enumFromUnknown<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  fallback: T[number],
): T[number] {
  const normalized = stringFromUnknown(value);
  return allowed.includes(normalized) ? normalized : fallback;
}

function booleanFromUnknown(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return false;

  return ["true", "yes", "需要", "是"].includes(value.trim().toLowerCase());
}

export function parseReviewExtractedFieldsText(
  text: string,
): ParsedExtractedFields {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: true, value: {} };
  }

  try {
    const value = JSON.parse(trimmed) as unknown;
    if (
      typeof value !== "object" ||
      value === null ||
      Array.isArray(value)
    ) {
      return {
        ok: false,
        message:
          '结构化字段必须是 JSON object，例如 { "nextAction": "下周跟进" }。',
      };
    }

    return { ok: true, value: value as Record<string, unknown> };
  } catch {
    return {
      ok: false,
      message: "结构化字段不是合法 JSON，请先修正再保存。",
    };
  }
}

export function buildReviewNaturalFields(
  extractedFields: Record<string, unknown>,
): ReviewNaturalFields {
  const naturalFields = { ...emptyNaturalFields };

  for (const fieldKey of naturalFieldKeys) {
    for (const alias of naturalFieldAliases[fieldKey]) {
      const value = stringFromUnknown(extractedFields[alias]);
      if (value) {
        naturalFields[fieldKey] = value;
        break;
      }
    }
  }

  return naturalFields;
}

export function buildReviewAiFields(
  extractedFields: Record<string, unknown>,
): ReviewAiFields {
  return {
    phone: stringFromUnknown(extractedFields.phone),
    email: stringFromUnknown(extractedFields.email),
    telegram: stringFromUnknown(extractedFields.telegram),
    wechatAlias: stringFromUnknown(extractedFields.wechatAlias),
    leadQuality: enumFromUnknown(
      extractedFields.leadQuality,
      ["hot", "warm", "cold", "not_a_lead", "unknown"] as const,
      "unknown",
    ),
    confidence: enumFromUnknown(
      extractedFields.confidence,
      ["high", "medium", "low", "unknown"] as const,
      "unknown",
    ),
    actionRequired: booleanFromUnknown(extractedFields.actionRequired),
    evidenceNotes: stringFromUnknown(extractedFields.evidenceNotes),
  };
}

export function mergeReviewNaturalFields(
  originalFields: Record<string, unknown>,
  naturalFields: ReviewNaturalFields,
): Record<string, unknown> {
  const merged = { ...originalFields };

  for (const fieldKey of naturalFieldKeys) {
    delete merged[fieldKey];
  }

  for (const [fieldKey, value] of Object.entries(naturalFields) as [
    keyof ReviewNaturalFields,
    string,
  ][]) {
    const normalized = value.trim();
    if (normalized) {
      merged[fieldKey] = normalized;
    }
  }

  return merged;
}

export function mergeReviewAiFields(
  originalFields: Record<string, unknown>,
  aiFields: ReviewAiFields,
): Record<string, unknown> {
  const merged = { ...originalFields };

  for (const fieldKey of aiFieldKeys) {
    delete merged[fieldKey];
  }

  for (const [fieldKey, value] of Object.entries(aiFields) as [
    keyof ReviewAiFields,
    ReviewAiFields[keyof ReviewAiFields],
  ][]) {
    if (typeof value === "boolean") {
      merged[fieldKey] = value;
      continue;
    }

    const normalized = value.trim();
    if (normalized && normalized !== "unknown") {
      merged[fieldKey] = normalized;
    }
  }

  return merged;
}
