import { buildVisionExtractionFields, type VisionExtractionResult } from "@/server/ai/vision-extraction";

export interface VisionReviewPatchInput {
  currentSummary?: string | null;
  rawText?: string | null;
  existingFields: Record<string, unknown>;
  extraction: VisionExtractionResult;
}

export interface VisionReviewPatch {
  summary: string;
  extractedFields: Record<string, unknown>;
}

function firstNonBlank(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const normalized = value?.trim();
    if (normalized) return normalized;
  }

  return "AI 已完成初步提取，请人工确认。";
}

export function buildVisionReviewPatch(
  input: VisionReviewPatchInput,
): VisionReviewPatch {
  return {
    summary: firstNonBlank(
      input.extraction.summary,
      input.currentSummary,
      input.rawText,
    ),
    extractedFields: {
      ...input.existingFields,
      ...buildVisionExtractionFields(input.extraction),
    },
  };
}
