import axiosInstance from "@/src/api/axiosInstance";
import {
  CheckOutResponse,
  OperationalTask,
  PageResponse,
  TaskStatusHistory,
} from "@/src/types/types";
import { API_URLS } from "@/src/util/apiConstants";

const CLEANING_SPECIALIZATION = "CLEANING";

export const checkOutWorkflowQueryKeys = {
  root: ["check-out-workflow"] as const,
  existingCleaningTask: (reservationId: number) =>
    ["check-out-workflow", "reservation-cleaning-task", reservationId] as const,
  task: (taskId: number) => ["check-out-workflow", "task", taskId] as const,
  taskHistory: (taskId: number) => ["check-out-workflow", "task-history", taskId] as const,
};

export const checkOutWorkflowService = {
  checkOut: async (reservationId: number): Promise<CheckOutResponse> => {
    const response = await axiosInstance.post<CheckOutResponse>(API_URLS.checkOutWorkflows.checkOut(reservationId));
    return response.data;
  },

  getTask: async (taskId: number): Promise<OperationalTask> => {
    const response = await axiosInstance.get<OperationalTask>(API_URLS.checkOutWorkflows.task(taskId));
    return response.data;
  },

  getTaskHistory: async (taskId: number): Promise<TaskStatusHistory[]> => {
    const response = await axiosInstance.get<TaskStatusHistory[]>(API_URLS.checkOutWorkflows.taskHistory(taskId));
    return response.data;
  },

  getExistingCleaningTask: async (reservationId: number): Promise<OperationalTask | null> => {
    const response = await axiosInstance.get<PageResponse<OperationalTask>>(API_URLS.checkOutWorkflows.tasks, {
      params: {
        reservationId,
        page: 0,
        size: 20,
        sort: "createdAt,asc",
      },
    });

    return response.data.content.find(
      (task) => task.reservationId === reservationId && task.specializationCode === CLEANING_SPECIALIZATION
    ) ?? null;
  },
};
