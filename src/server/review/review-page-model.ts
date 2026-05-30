import type { CustomerListItem } from "@/server/customers/customer-dashboard";
import {
  buildReviewAiFields,
  buildReviewNaturalFields,
  type ReviewAiFields,
  type ReviewNaturalFields,
} from "@/lib/review-form";
import type { PendingReviewItem } from "./review-queue";

export interface ReviewQueueViewItem {
  id: string;
  contentType: string;
  sourceChannel: string;
  rawText: string | null;
  summary: string;
  isTestRecord: boolean;
  extractedFields: Record<string, unknown>;
  naturalFields: ReviewNaturalFields;
  aiFields: ReviewAiFields;
  extractedFieldsText: string;
  capturedAt: string;
  attachments: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    storageKey: string;
    previewUrl: string | null;
    canPreviewInline: boolean;
    unavailableReason: string | null;
  }>;
}

export interface CustomerSelectOption {
  id: string;
  label: string;
}

export type ReviewContentTypeFilter = "all" | "image" | "text" | "card_photo";
export type ReviewRecordScopeFilter = "real" | "test" | "all";

const testTextPatterns = [
  "dogfood",
  "api 实测",
  "step",
  "m1.",
  "m1_",
];

const testAttachmentPatterns = ["m116-demo", "m118-demo", "demo-api-image"];

function isObviousTestRecord(item: PendingReviewItem): boolean {
  const textHaystack = [
    item.event.rawText,
    item.event.aiSummary,
    JSON.stringify(item.event.extractedFieldsJson),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const attachmentHaystack = item.attachments
    .flatMap((attachment) => [attachment.fileName, attachment.storageKey])
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    testTextPatterns.some((pattern) => textHaystack.includes(pattern)) ||
    testAttachmentPatterns.some((pattern) =>
      attachmentHaystack.includes(pattern),
    )
  );
}

export function buildReviewQueueViewItems(
  items: PendingReviewItem[],
): ReviewQueueViewItem[] {
  return items.map((item) => ({
    id: item.event.id,
    contentType: item.event.contentType,
    sourceChannel: item.event.sourceChannel,
    rawText: item.event.rawText,
    summary:
      item.event.aiSummary ?? item.event.rawText ?? "这条记录还没有摘要。",
    isTestRecord: isObviousTestRecord(item),
    extractedFields: item.event.extractedFieldsJson,
    naturalFields: buildReviewNaturalFields(item.event.extractedFieldsJson),
    aiFields: buildReviewAiFields(item.event.extractedFieldsJson),
    extractedFieldsText: JSON.stringify(
      item.event.extractedFieldsJson,
      null,
      2,
    ),
    capturedAt: item.event.capturedAt.toISOString(),
    attachments: item.attachments.map((attachment) => ({
      id: attachment.id,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      storageKey: attachment.storageKey,
      previewUrl: attachment.storageKey.startsWith("local-images/")
        ? `/api/attachments/${attachment.id}`
        : null,
      canPreviewInline:
        attachment.storageKey.startsWith("local-images/") &&
        attachment.mimeType.startsWith("image/"),
      unavailableReason: attachment.storageKey.startsWith("local-images/")
        ? null
        : "这份附件不是本地图片，暂时只能保留文件记录。",
    })),
  }));
}

function includesReviewQuery(item: ReviewQueueViewItem, query: string): boolean {
  const haystack = [
    item.summary,
    item.rawText,
    item.contentType,
    item.sourceChannel,
    item.extractedFieldsText,
    ...item.attachments.map((attachment) => attachment.fileName),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export function filterReviewQueueViewItems(
  items: ReviewQueueViewItem[],
  filters: {
    query?: string;
    contentType?: ReviewContentTypeFilter;
    recordScope?: ReviewRecordScopeFilter;
  },
): ReviewQueueViewItem[] {
  const query = filters.query?.trim().toLowerCase() ?? "";
  const contentType = filters.contentType ?? "all";
  const recordScope = filters.recordScope ?? "real";

  return items.filter((item) => {
    const matchesQuery = query ? includesReviewQuery(item, query) : true;
    const matchesContentType =
      contentType === "all" || item.contentType === contentType;
    const matchesRecordScope =
      recordScope === "all" ||
      (recordScope === "real" && !item.isTestRecord) ||
      (recordScope === "test" && item.isTestRecord);

    return matchesQuery && matchesContentType && matchesRecordScope;
  });
}

export function buildCustomerSelectOptions(
  customers: CustomerListItem[],
): CustomerSelectOption[] {
  return customers.map((customer) => ({
    id: customer.id,
    label: customer.companyName
      ? `${customer.displayName} · ${customer.companyName}`
      : customer.displayName,
  }));
}
