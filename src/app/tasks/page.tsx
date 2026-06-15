import { requireCurrentUser } from "@/server/auth/current-user";
import { listCustomerListItems } from "@/server/customers/customer-dashboard";
import { createDb } from "@/server/db";
import {
  buildTaskCustomerOptions,
  buildTaskPageItems,
} from "@/server/tasks/task-page-model";
import { listTasks } from "@/server/tasks/task-workflow";
import { TasksClient } from "./tasks-client";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const { client, db } = createDb();

  try {
    const currentUser = await requireCurrentUser(db);
    const [tasks, customers] = await Promise.all([
      listTasks(db, currentUser.id),
      listCustomerListItems(db, currentUser.id),
    ]);

    return (
      <TasksClient
        customers={buildTaskCustomerOptions(customers)}
        initialTasks={buildTaskPageItems(tasks)}
      />
    );
  } finally {
    await client.end();
  }
}
