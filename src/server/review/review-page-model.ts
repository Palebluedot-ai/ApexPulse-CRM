import type { CustomerListItem } from "@/server/customers/customer-dashboard";
import type { PendingReviewItem } from "./review-queue";

export interface ReviewQueueViewItem {
  id: string;
  contentType: string;
  sourceChannel: string;
  rawText: string | null;
  summary: string;
  extractedFieldsText: string;
  capturedAt: string;
  attachments: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    storageKey: string;
  }>;
}

export interface CustomerSelectOption {
  id: string;
  label: string;
}

export type ReviewContentTypeFilter = "all" | "image" | "text" | "card_photo";

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
  },
): ReviewQueueViewItem[] {
  const query = filters.query?.trim().toLowerCase() ?? "";
  const contentType = filters.contentType ?? "all";

  return items.filter((item) => {
    const matchesQuery = query ? includesReviewQuery(item, query) : true;
    const matchesContentType =
      contentType === "all" || item.contentType === contentType;

    return matchesQuery && matchesContentType;
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
