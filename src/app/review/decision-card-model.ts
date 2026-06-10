import type {
  CustomerSelectOption,
  ReviewQueueViewItem,
} from "@/server/review/review-page-model";

export interface HeatBadge {
  label: string;
  tone: "hot" | "warm" | "cold";
}

const leadQualityBadges: Record<
  ReviewQueueViewItem["aiFields"]["leadQuality"],
  { label: string; tone: HeatBadge["tone"] }
> = {
  hot: { label: "HOT", tone: "hot" },
  warm: { label: "WARM", tone: "warm" },
  cold: { label: "COLD", tone: "cold" },
  not_a_lead: { label: "非线索", tone: "cold" },
  unknown: { label: "待判断", tone: "cold" },
};

const confidenceSuffixes: Record<
  ReviewQueueViewItem["aiFields"]["confidence"],
  string
> = {
  high: " · 高置信",
  medium: " · 中置信",
  low: " · 低置信",
  unknown: "",
};

export function buildHeatBadge(item: ReviewQueueViewItem): HeatBadge {
  const badge = leadQualityBadges[item.aiFields.leadQuality];
  return {
    label: `${badge.label}${confidenceSuffixes[item.aiFields.confidence]}`,
    tone: badge.tone,
  };
}

export function buildCardTitle(item: ReviewQueueViewItem): string {
  return item.naturalFields.customerName.trim() || "未识别客户";
}

export interface DecisionKeyField {
  label: string;
  value: string;
}

const keyFieldOrder = [
  { label: "需求", key: "needSummary" },
  { label: "下一步", key: "nextAction" },
  { label: "来源", key: "sourceTag" },
  { label: "跟进", key: "nextFollowupAt" },
] as const;

export function buildDecisionKeyFields(
  item: ReviewQueueViewItem,
): DecisionKeyField[] {
  return keyFieldOrder
    .map(({ label, key }) => ({
      label,
      value: item.naturalFields[key].trim(),
    }))
    .filter((field) => field.value)
    .slice(0, 3);
}

export function buildBindPrediction(
  item: ReviewQueueViewItem,
  selectedPartyId: string,
  customers: CustomerSelectOption[],
): string {
  if (selectedPartyId) {
    const customer = customers.find((option) => option.id === selectedPartyId);
    if (customer) return `✓ 绑定已有客户 ${customer.label}`;
  }

  const name = item.naturalFields.customerName.trim();
  return name ? `⊕ 将新建客户 ${name}` : "⊕ 将新建客户（名称待确认）";
}

export function awaitingAutoExtraction(item: ReviewQueueViewItem): boolean {
  if (item.extractedFields.aiExtractionSource) return false;
  return (
    Boolean(item.rawText?.trim()) ||
    item.attachments.some((attachment) => attachment.canPreviewInline)
  );
}
