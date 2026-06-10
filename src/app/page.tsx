import { createDb } from "@/server/db";
import {
  buildCustomerDashboardStats,
  listCustomerListItems,
} from "@/server/customers/customer-dashboard";
import { getWeeklyReport } from "@/server/reports/weekly-report";
import { listPendingReviewItems } from "@/server/review/review-queue";
import { buildTaskPageItems } from "@/server/tasks/task-page-model";
import { listTasks } from "@/server/tasks/task-workflow";
import { groupTasksByUrgency } from "@/lib/task-grouping";
import { HomeClient } from "./home-client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { client, db } = createDb();

  try {
    const [tasks, customers, pendingItems, weeklyReport] = await Promise.all([
      listTasks(db),
      listCustomerListItems(db),
      listPendingReviewItems(db, 100),
      getWeeklyReport(db),
    ]);

    const now = new Date();
    const openTasks = buildTaskPageItems(
      tasks.filter((task) => task.status === "open"),
    );
    const groups = groupTasksByUrgency(openTasks, (task) => task.dueAt, now);
    const customerStats = buildCustomerDashboardStats(customers);

    const dateHeading = new Intl.DateTimeFormat("zh-HK", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(now);
    const sublineParts = [
      groups.urgent.length > 0 ? `${groups.urgent.length} 条任务要先处理` : null,
      customerStats.overdue > 0 ? `${customerStats.overdue} 个客户逾期` : null,
      pendingItems.length > 0 ? `${pendingItems.length} 条待确认` : null,
    ].filter(Boolean);

    return (
      <HomeClient
        dateHeading={dateHeading}
        pendingCount={pendingItems.length}
        subline={
          sublineParts.length > 0 ? sublineParts.join(" · ") : "今天没有欠账 ✓"
        }
        urgentTasks={groups.urgent.slice(0, 6)}
        weekStats={{
          touchedCustomers: weeklyReport.summary.touchedCustomerCount,
          newCustomers: weeklyReport.summary.newCustomerCount,
          overdueCustomers: customerStats.overdue,
        }}
        weekTasks={groups.thisWeek.slice(0, 4)}
      />
    );
  } finally {
    await client.end();
  }
}
