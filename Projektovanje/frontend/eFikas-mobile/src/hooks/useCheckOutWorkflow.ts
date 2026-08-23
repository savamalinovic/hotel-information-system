import {
  checkOutWorkflowQueryKeys,
  checkOutWorkflowService,
} from "@/src/api/services/checkOutWorkflowService";
import { paymentWorkflowQueryKeys } from "@/src/api/services/paymentWorkflowService";
import { reservationWorkflowQueryKeys } from "@/src/api/services/reservationWorkflowService";
import { isAxiosError } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parsePositiveId, requirePositiveId } from "@/src/util/idParams";

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
    mutationFn: (reservationId: number) => checkOutWorkflowService.checkOut(requirePositiveId(reservationId)),
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

export const useExistingCleaningTask = (reservationId: number | null | undefined, enabled: boolean) => {
  const validReservationId = parsePositiveId(reservationId);

  return useQuery({
    queryKey: checkOutWorkflowQueryKeys.existingCleaningTask(validReservationId ?? 0),
    queryFn: () => checkOutWorkflowService.getExistingCleaningTask(requirePositiveId(reservationId)),
    enabled: enabled && validReservationId !== null,
    retry: 1,
  });
};

export const useCheckOutTask = (taskId: number | null | undefined) => {
  const validTaskId = parsePositiveId(taskId);

  return useQuery({
    queryKey: checkOutWorkflowQueryKeys.task(validTaskId ?? 0),
    queryFn: () => checkOutWorkflowService.getTask(requirePositiveId(taskId)),
    enabled: validTaskId !== null,
    retry: 1,
  });
};

export const useCheckOutTaskHistory = (taskId: number | null | undefined) => {
  const validTaskId = parsePositiveId(taskId);

  return useQuery({
    queryKey: checkOutWorkflowQueryKeys.taskHistory(validTaskId ?? 0),
    queryFn: () => checkOutWorkflowService.getTaskHistory(requirePositiveId(taskId)),
    enabled: validTaskId !== null,
    retry: 1,
  });
};
