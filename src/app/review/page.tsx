import { listCustomerListItems } from "@/server/customers/customer-dashboard";
import { createDb } from "@/server/db";
import {
  buildCustomerSelectOptions,
  buildReviewQueueViewItems,
} from "@/server/review/review-page-model";
import { listPendingReviewItems } from "@/server/review/review-queue";
import { ReviewClient } from "./review-client";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const { client, db } = createDb();

  try {
    const [pendingItems, customers] = await Promise.all([
      listPendingReviewItems(db),
      listCustomerListItems(db),
    ]);

    return (
      <ReviewClient
        customers={buildCustomerSelectOptions(customers)}
        initialItems={buildReviewQueueViewItems(pendingItems)}
      />
    );
  } finally {
    await client.end();
  }
}
