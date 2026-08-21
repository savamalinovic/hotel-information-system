import { NotificationItem, UserRole } from "@/src/types/types";

export type NotificationPushData = {
  notificationId: number | null;
  type: string | null;
  taskId: number | null;
};

const toPositiveInteger = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }
  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

export const parseNotificationPushData = (data: unknown): NotificationPushData => {
  const record = data && typeof data === "object" ? data as Record<string, unknown> : {};
  return {
    notificationId: toPositiveInteger(record.notificationId),
    type: typeof record.type === "string" ? record.type : null,
    taskId: toPositiveInteger(record.taskId),
  };
};

export const canOpenWorkerTask = (role: UserRole, type: string | null, taskId: number | null) =>
  role === "OPERATIONAL_WORKER" && type === "TASK_AVAILABLE" && taskId !== null;

export const notificationTaskId = (notification: NotificationItem): number | null =>
  canOpenWorkerTask("OPERATIONAL_WORKER", notification.type, notification.taskId)
    ? notification.taskId
    : null;
