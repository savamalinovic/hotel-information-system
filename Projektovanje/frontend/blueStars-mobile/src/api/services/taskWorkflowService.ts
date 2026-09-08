import axiosInstance from "@/src/api/axiosInstance";
import { postMultipart } from "@/src/api/multipartUpload";
import {
  OperationalTask,
  PageResponse,
  Specialization,
  TaskAttachment,
  TaskHistory,
  TaskPriority,
  TaskStatus,
} from "@/src/types/types";
import { API_URLS } from "@/src/util/apiConstants";

export type TaskListFilters = {
  status?: TaskStatus;
  specializationId?: number;
  apartmentId?: number;
  reservationId?: number;
  assignedWorkerId?: number;
  page: number;
  size: number;
  sort: string;
};

export type WorkerTaskListFilters = {
  status?: TaskStatus;
  page: number;
  size: number;
  sort: string;
};

export type CreateTaskRequest = {
  specializationId: number;
  apartmentId?: number;
  reservationId?: number;
  title: string;
  description: string;
  priority: TaskPriority;
};

export type TaskUploadFile = {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
  file?: Blob;
};

export const taskWorkflowQueryKeys = {
  root: ["task-workflows"] as const,
  specializations: ["task-workflows", "specializations"] as const,
  agentTasks: (filters: Omit<TaskListFilters, "page">) => ["task-workflows", "agent-list", filters] as const,
  available: (filters: Omit<WorkerTaskListFilters, "status" | "page">) => ["task-workflows", "available", filters] as const,
  mine: (filters: Omit<WorkerTaskListFilters, "page">) => ["task-workflows", "mine", filters] as const,
  task: (taskId: number) => ["task-workflows", "detail", taskId] as const,
  history: (taskId: number) => ["task-workflows", "history", taskId] as const,
  attachments: (taskId: number) => ["task-workflows", "attachments", taskId] as const,
};

export const taskWorkflowService = {
  getSpecializations: async (): Promise<Specialization[]> => {
    const response = await axiosInstance.get<Specialization[]>(API_URLS.taskWorkflows.specializations);
    return response.data;
  },

  getAgentTasks: async (filters: TaskListFilters): Promise<PageResponse<OperationalTask>> => {
    const response = await axiosInstance.get<PageResponse<OperationalTask>>(API_URLS.taskWorkflows.tasks, {
      params: filters,
    });
    return response.data;
  },

  getAvailableTasks: async (filters: Omit<WorkerTaskListFilters, "status">): Promise<PageResponse<OperationalTask>> => {
    const response = await axiosInstance.get<PageResponse<OperationalTask>>(API_URLS.taskWorkflows.available, {
      params: filters,
    });
    return response.data;
  },

  getMyTasks: async (filters: WorkerTaskListFilters): Promise<PageResponse<OperationalTask>> => {
    const response = await axiosInstance.get<PageResponse<OperationalTask>>(API_URLS.taskWorkflows.mine, {
      params: filters,
    });
    return response.data;
  },

  getTask: async (taskId: number): Promise<OperationalTask> => {
    const response = await axiosInstance.get<OperationalTask>(API_URLS.taskWorkflows.task(taskId));
    return response.data;
  },

  getHistory: async (taskId: number): Promise<TaskHistory[]> => {
    const response = await axiosInstance.get<TaskHistory[]>(API_URLS.taskWorkflows.history(taskId));
    return response.data;
  },

  getAttachments: async (taskId: number): Promise<TaskAttachment[]> => {
    const response = await axiosInstance.get<TaskAttachment[]>(API_URLS.taskWorkflows.attachments(taskId));
    return response.data;
  },

  createTask: async (request: CreateTaskRequest): Promise<OperationalTask> => {
    const response = await axiosInstance.post<OperationalTask>(API_URLS.taskWorkflows.tasks, request);
    return response.data;
  },

  claimTask: async (taskId: number): Promise<OperationalTask> => {
    const response = await axiosInstance.post<OperationalTask>(API_URLS.taskWorkflows.claim(taskId));
    return response.data;
  },

  startTask: async (taskId: number): Promise<OperationalTask> => {
    const response = await axiosInstance.post<OperationalTask>(API_URLS.taskWorkflows.start(taskId));
    return response.data;
  },

  blockTask: async (taskId: number, reason: string): Promise<OperationalTask> => {
    const response = await axiosInstance.post<OperationalTask>(API_URLS.taskWorkflows.block(taskId), { reason });
    return response.data;
  },

  resumeTask: async (taskId: number): Promise<OperationalTask> => {
    const response = await axiosInstance.post<OperationalTask>(API_URLS.taskWorkflows.resume(taskId));
    return response.data;
  },

  completeTask: async (taskId: number): Promise<OperationalTask> => {
    const response = await axiosInstance.post<OperationalTask>(API_URLS.taskWorkflows.complete(taskId));
    return response.data;
  },

  cancelTask: async (taskId: number, reason: string): Promise<OperationalTask> => {
    const response = await axiosInstance.post<OperationalTask>(API_URLS.taskWorkflows.cancel(taskId), { reason });
    return response.data;
  },

  uploadAttachment: async (taskId: number, attachment: TaskUploadFile): Promise<TaskAttachment> => {
    const formData = new FormData();
    const filePart = attachment.file ?? {
      uri: attachment.uri,
      name: attachment.name,
      type: attachment.mimeType ?? "application/octet-stream",
    };
    formData.append("file", filePart as unknown as Blob);
    const response = await postMultipart<TaskAttachment>(
      API_URLS.taskWorkflows.attachments(taskId),
      formData,
    );
    return response.data;
  },
};
