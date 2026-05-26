type ParsedExtractedFields =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; message: string };

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
