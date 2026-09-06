import {
  CreateAvailabilityOverrideRequest,
  CreateLeaveRequest,
  workforceQueryKeys,
  workforceService,
  WorkforcePageFilters,
} from "@/src/api/services/workforceService";
import { taskWorkflowQueryKeys } from "@/src/api/services/taskWorkflowService";
import { isAxiosError } from "axios";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

const invalidateWorkforceDependencies = async (queryClient: ReturnType<typeof useQueryClient>) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: workforceQueryKeys.root }),
    queryClient.invalidateQueries({ queryKey: taskWorkflowQueryKeys.root }),
    queryClient.invalidateQueries({ queryKey: ["agent-dashboard"] }),
  ]);
};

export const workforceStateMayHaveChanged = (error: unknown) => isAxiosError(error)
  && (
    error.response?.status === 409
    || error.response?.status === undefined
    || (error.response?.status >= 500 && error.response.status < 600)
    || error.code === "ECONNABORTED"
    || error.code === "ETIMEDOUT"
  );

const useWorkforcePages = <T>(
  queryKey: readonly unknown[],
  filters: Omit<WorkforcePageFilters, "page">,
  queryFn: (filtersWithPage: WorkforcePageFilters) => Promise<{ content: T[]; page: number; totalPages: number }>
) => {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => queryFn({ ...filters, page: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.page + 1 < lastPage.totalPages ? lastPage.page + 1 : undefined,
    retry: 1,
  });
  const rows = useMemo(() => query.data?.pages.flatMap((page) => page.content) ?? [], [query.data]);
  return { ...query, rows };
};

export const useWorkerAvailability = () => useQuery({
  queryKey: workforceQueryKeys.availability,
  queryFn: workforceService.getAvailability,
  retry: 1,
  refetchInterval: 60_000,
});

export const useAttendanceHistory = (filters: Omit<WorkforcePageFilters, "page">) =>
  useWorkforcePages(workforceQueryKeys.attendance(filters), filters, workforceService.getAttendance);

export const useAvailabilityOverrides = (filters: Omit<WorkforcePageFilters, "page">) =>
  useWorkforcePages(workforceQueryKeys.overrides(filters), filters, workforceService.getOverrides);

export const useLeaveRequests = (filters: Omit<WorkforcePageFilters, "page">) =>
  useWorkforcePages(workforceQueryKeys.leaveRequests(filters), filters, workforceService.getLeaveRequests);

const useWorkforceMutation = <TVariables>(mutationFn: (variables: TVariables) => Promise<unknown>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => invalidateWorkforceDependencies(queryClient),
    onError: (error) => workforceStateMayHaveChanged(error) ? invalidateWorkforceDependencies(queryClient) : Promise.resolve(),
  });
};

export const useClockIn = () => useWorkforceMutation(() => workforceService.clockIn());
export const useStartBreak = () => useWorkforceMutation(() => workforceService.startBreak());
export const useEndBreak = () => useWorkforceMutation(() => workforceService.endBreak());
export const useClockOut = () => useWorkforceMutation(() => workforceService.clockOut());
export const useCreateAvailabilityOverride = () => useWorkforceMutation((request: CreateAvailabilityOverrideRequest) => workforceService.createOverride(request));
export const useClearAvailabilityOverride = () => useWorkforceMutation((overrideId: number) => workforceService.clearOverride(overrideId));
export const useCreateLeaveRequest = () => useWorkforceMutation((request: CreateLeaveRequest) => workforceService.createLeaveRequest(request));
export const useCancelLeaveRequest = () => useWorkforceMutation((requestId: number) => workforceService.cancelLeaveRequest(requestId));
