import {
  CreateTaskRequest,
  taskWorkflowQueryKeys,
  taskWorkflowService,
  TaskListFilters,
  TaskUploadFile,
  WorkerTaskListFilters,
} from "@/src/api/services/taskWorkflowService";
import { workforceQueryKeys } from "@/src/api/services/workforceService";
import { OperationalTask, TaskStatus } from "@/src/types/types";
import { isAxiosError } from "axios";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { parsePositiveId, requirePositiveId } from "@/src/util/idParams";

const invalidateTaskDependencies = async (queryClient: ReturnType<typeof useQueryClient>) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: taskWorkflowQueryKeys.root }),
    queryClient.invalidateQueries({ queryKey: workforceQueryKeys.root }),
    queryClient.invalidateQueries({ queryKey: ["agent-dashboard"] }),
    queryClient.invalidateQueries({ queryKey: ["check-out-workflow"] }),
    queryClient.invalidateQueries({ queryKey: ["apartment-catalog"] }),
    queryClient.invalidateQueries({ queryKey: ["reservation-workflows"] }),
  ]);
};

const useTaskPages = <T, TFilters extends { page: number }>(
  queryKey: readonly unknown[],
  filters: Omit<TFilters, "page">,
  queryFn: (filtersWithPage: TFilters) => Promise<{ content: T[]; page: number; totalPages: number; totalElements: number }>
) => useInfiniteQuery({
  queryKey,
  queryFn: ({ pageParam }) => queryFn({ ...filters, page: pageParam } as TFilters),
  initialPageParam: 0,
  getNextPageParam: (lastPage) => lastPage.page + 1 < lastPage.totalPages ? lastPage.page + 1 : undefined,
  retry: 1,
});

export const useSpecializations = () => useQuery({
  queryKey: taskWorkflowQueryKeys.specializations,
  queryFn: taskWorkflowService.getSpecializations,
  staleTime: 60_000,
  retry: 1,
});

export const useAgentTasks = (filters: Omit<TaskListFilters, "page">) => {
  const query = useTaskPages<OperationalTask, TaskListFilters>(
    taskWorkflowQueryKeys.agentTasks(filters),
    filters,
    taskWorkflowService.getAgentTasks
  );
  const tasks = useMemo(() => query.data?.pages.flatMap((page) => page.content) ?? [], [query.data]);
  return { ...query, tasks };
};

export const useAvailableTasks = (filters: Omit<WorkerTaskListFilters, "status" | "page">) => {
  const query = useTaskPages<OperationalTask, Omit<WorkerTaskListFilters, "status">>(
    taskWorkflowQueryKeys.available(filters),
    filters,
    taskWorkflowService.getAvailableTasks
  );
  const tasks = useMemo(() => query.data?.pages.flatMap((page) => page.content) ?? [], [query.data]);
  return { ...query, tasks };
};

export const useMyTasks = (filters: Omit<WorkerTaskListFilters, "page">) => {
  const query = useTaskPages<OperationalTask, WorkerTaskListFilters>(
    taskWorkflowQueryKeys.mine(filters),
    filters,
    taskWorkflowService.getMyTasks
  );
  const tasks = useMemo(() => query.data?.pages.flatMap((page) => page.content) ?? [], [query.data]);
  return { ...query, tasks };
};

export const useTaskDetail = (taskId: number | null | undefined) => {
  const validTaskId = parsePositiveId(taskId);

  return useQuery({
    queryKey: taskWorkflowQueryKeys.task(validTaskId ?? 0),
    queryFn: () => taskWorkflowService.getTask(requirePositiveId(taskId)),
    enabled: validTaskId !== null,
    retry: 1,
  });
};

export const useTaskHistory = (taskId: number | null | undefined) => {
  const validTaskId = parsePositiveId(taskId);

  return useQuery({
    queryKey: taskWorkflowQueryKeys.history(validTaskId ?? 0),
    queryFn: () => taskWorkflowService.getHistory(requirePositiveId(taskId)),
    enabled: validTaskId !== null,
    retry: 1,
  });
};

export const useTaskAttachments = (taskId: number | null | undefined) => {
  const validTaskId = parsePositiveId(taskId);

  return useQuery({
    queryKey: taskWorkflowQueryKeys.attachments(validTaskId ?? 0),
    queryFn: () => taskWorkflowService.getAttachments(requirePositiveId(taskId)),
    enabled: validTaskId !== null,
    retry: 1,
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateTaskRequest) => taskWorkflowService.createTask({
      ...request,
      specializationId: requirePositiveId(request.specializationId),
      ...(request.apartmentId === undefined ? {} : { apartmentId: requirePositiveId(request.apartmentId) }),
      ...(request.reservationId === undefined ? {} : { reservationId: requirePositiveId(request.reservationId) }),
    }),
    onSuccess: () => invalidateTaskDependencies(queryClient),
    onError: (error) => isAxiosError(error) && error.response?.status === 409 ? invalidateTaskDependencies(queryClient) : Promise.resolve(),
  });
};

const useTaskMutation = <TVariables>(mutationFn: (variables: TVariables) => Promise<unknown>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => invalidateTaskDependencies(queryClient),
    onError: (error) => isAxiosError(error) && error.response?.status === 409 ? invalidateTaskDependencies(queryClient) : Promise.resolve(),
  });
};

export const useClaimTask = () => useTaskMutation((taskId: number) => taskWorkflowService.claimTask(requirePositiveId(taskId)));
export const useStartTask = () => useTaskMutation((taskId: number) => taskWorkflowService.startTask(requirePositiveId(taskId)));
export const useBlockTask = () => useTaskMutation(({ taskId, reason }: { taskId: number; reason: string }) => taskWorkflowService.blockTask(requirePositiveId(taskId), reason));
export const useResumeTask = () => useTaskMutation((taskId: number) => taskWorkflowService.resumeTask(requirePositiveId(taskId)));
export const useCompleteTask = () => useTaskMutation((taskId: number) => taskWorkflowService.completeTask(requirePositiveId(taskId)));
export const useCancelTask = () => useTaskMutation(({ taskId, reason }: { taskId: number; reason: string }) => taskWorkflowService.cancelTask(requirePositiveId(taskId), reason));
export const useUploadTaskAttachment = () => useTaskMutation(({ taskId, file }: { taskId: number; file: TaskUploadFile }) => taskWorkflowService.uploadAttachment(requirePositiveId(taskId), file));

export const taskStatusGroups: Record<"active" | "blocked" | "history", TaskStatus[]> = {
  active: ["ASSIGNED", "IN_PROGRESS"],
  blocked: ["BLOCKED"],
  history: ["COMPLETED", "CANCELLED"],
};
