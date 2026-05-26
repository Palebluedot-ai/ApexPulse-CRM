import type { CustomerListItem } from "@/server/customers/customer-dashboard";
import type { TaskListItem } from "./task-workflow";

export interface TaskPageItem {
  id: string;
  partyId: string | null;
  partyName: string | null;
  sourceEventId: string | null;
  taskType: TaskListItem["taskType"];
  description: string;
  dueAt: string | null;
  status: TaskListItem["status"];
  completedAt: string | null;
}

export interface TaskCustomerOption {
  id: string;
  label: string;
}

function serializeDate(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

export function buildTaskPageItems(tasks: TaskListItem[]): TaskPageItem[] {
  return tasks.map((task) => ({
    id: task.id,
    partyId: task.partyId,
    partyName: task.partyName,
    sourceEventId: task.sourceEventId,
    taskType: task.taskType,
    description: task.description,
    dueAt: serializeDate(task.dueAt),
    status: task.status,
    completedAt: serializeDate(task.completedAt),
  }));
}

export function buildTaskCustomerOptions(
  customers: CustomerListItem[],
): TaskCustomerOption[] {
  return customers.map((customer) => ({
    id: customer.id,
    label: customer.companyName
      ? `${customer.displayName} · ${customer.companyName}`
      : customer.displayName,
  }));
}
