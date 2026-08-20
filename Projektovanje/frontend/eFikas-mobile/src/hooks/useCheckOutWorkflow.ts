import {
  checkOutWorkflowQueryKeys,
  checkOutWorkflowService,
} from "@/src/api/services/checkOutWorkflowService";
import { paymentWorkflowQueryKeys } from "@/src/api/services/paymentWorkflowService";
import { reservationWorkflowQueryKeys } from "@/src/api/services/reservationWorkflowService";
import { isAxiosError } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const isValidId = (value: number) => Number.isInteger(value) && value > 0;

const invalidateCheckOutDependencies = async (
  queryClient: ReturnType<typeof useQueryClient>,
  reservationId: number,
  taskId?: number
) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: reservationWorkflowQueryKeys.reservation(reservationId) }),
    queryClient.invalidateQueries({ queryKey: reservationWorkflowQueryKeys.statusHistory(reservationId) }),
    queryClient.invalidateQueries({ queryKey: reservationWorkflowQueryKeys.root }),
    queryClient.invalidateQueries({ queryKey: paymentWorkflowQueryKeys.summary(reservationId) }),
    queryClient.invalidateQueries({ queryKey: paymentWorkflowQueryKeys.root }),
    queryClient.invalidateQueries({ queryKey: ["apartment-catalog"] }),
    queryClient.invalidateQueries({ queryKey: ["agent-dashboard"] }),
    queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    queryClient.invalidateQueries({ queryKey: checkOutWorkflowQueryKeys.root }),
    ...(taskId ? [
      queryClient.invalidateQueries({ queryKey: checkOutWorkflowQueryKeys.task(taskId) }),
      queryClient.invalidateQueries({ queryKey: checkOutWorkflowQueryKeys.taskHistory(taskId) }),
    ] : []),
  ]);
};

export const useCheckOut = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reservationId: number) => checkOutWorkflowService.checkOut(reservationId),
    onSuccess: (response) =>
      invalidateCheckOutDependencies(queryClient, response.reservationId, response.cleaningTaskId),
    onError: (error, reservationId) => {
      if (isAxiosError(error) && error.response?.status === 409) {
        return invalidateCheckOutDependencies(queryClient, reservationId);
      }

      return Promise.resolve();
    },
  });
};

export const useExistingCleaningTask = (reservationId: number, enabled: boolean) =>
  useQuery({
    queryKey: checkOutWorkflowQueryKeys.existingCleaningTask(reservationId),
    queryFn: () => checkOutWorkflowService.getExistingCleaningTask(reservationId),
    enabled: enabled && isValidId(reservationId),
    retry: 1,
  });

export const useCheckOutTask = (taskId: number | undefined) =>
  useQuery({
    queryKey: checkOutWorkflowQueryKeys.task(taskId ?? 0),
    queryFn: () => checkOutWorkflowService.getTask(taskId ?? 0),
    enabled: taskId !== undefined && isValidId(taskId),
    retry: 1,
  });

export const useCheckOutTaskHistory = (taskId: number | undefined) =>
  useQuery({
    queryKey: checkOutWorkflowQueryKeys.taskHistory(taskId ?? 0),
    queryFn: () => checkOutWorkflowService.getTaskHistory(taskId ?? 0),
    enabled: taskId !== undefined && isValidId(taskId),
    retry: 1,
  });
