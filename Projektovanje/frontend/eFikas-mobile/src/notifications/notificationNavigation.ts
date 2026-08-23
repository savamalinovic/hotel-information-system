import { NotificationItem, UserRole } from "@/src/types/types";
import { parsePositiveId } from "@/src/util/idParams";

export type NotificationPushData = {
  notificationId: number | null;
  type: string | null;
  taskId: number | null;
};

export const parseNotificationPushData = (data: unknown): NotificationPushData => {
  const record = data && typeof data === "object" ? data as Record<string, unknown> : {};
  return {
    notificationId: parsePositiveId(record.notificationId),
    type: typeof record.type === "string" ? record.type : null,
    taskId: parsePositiveId(record.taskId),
  };
};

export const canOpenWorkerTask = (role: UserRole, type: string | null, taskId: number | null) =>
  role === "OPERATIONAL_WORKER" && type === "TASK_AVAILABLE" && taskId !== null;

export const notificationTaskId = (notification: NotificationItem): number | null => {
  const taskId = parsePositiveId(notification.taskId);

  return canOpenWorkerTask("OPERATIONAL_WORKER", notification.type, taskId) ? taskId : null;
};
