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
