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

const emptyNaturalFields: ReviewNaturalFields = {
  customerName: "",
  companyName: "",
  sourceTag: "",
  needSummary: "",
  nextAction: "",
  nextFollowupAt: "",
};

const naturalFieldKeys = Object.keys(
  emptyNaturalFields,
) as (keyof ReviewNaturalFields)[];

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
