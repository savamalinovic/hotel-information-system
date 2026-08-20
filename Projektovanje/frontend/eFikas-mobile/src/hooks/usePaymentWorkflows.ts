import {
  paymentWorkflowQueryKeys,
  paymentWorkflowService,
} from "@/src/api/services/paymentWorkflowService";
import { reservationWorkflowQueryKeys } from "@/src/api/services/reservationWorkflowService";
import {
  CorrectPaymentRequest,
  RecordPaymentRequest,
  ReversePaymentRequest,
} from "@/src/types/types";
import { isAxiosError } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const refreshPaymentDependencies = async (
  queryClient: ReturnType<typeof useQueryClient>,
  reservationId: number,
  refetchImmediately = false
) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: paymentWorkflowQueryKeys.root }),
    queryClient.invalidateQueries({ queryKey: paymentWorkflowQueryKeys.summary(reservationId) }),
    queryClient.invalidateQueries({ queryKey: paymentWorkflowQueryKeys.ledger(reservationId) }),
    queryClient.invalidateQueries({ queryKey: reservationWorkflowQueryKeys.reservation(reservationId) }),
    queryClient.invalidateQueries({ queryKey: reservationWorkflowQueryKeys.root }),
    queryClient.invalidateQueries({ queryKey: ["agent-dashboard"] }),
  ]);

  if (refetchImmediately) {
    await Promise.all([
      queryClient.refetchQueries({ queryKey: paymentWorkflowQueryKeys.summary(reservationId) }),
      queryClient.refetchQueries({ queryKey: paymentWorkflowQueryKeys.ledger(reservationId) }),
      queryClient.refetchQueries({ queryKey: reservationWorkflowQueryKeys.reservation(reservationId) }),
    ]);
  }
};

const refreshAfterPaymentFailure = async (
  queryClient: ReturnType<typeof useQueryClient>,
  reservationId: number,
  error: unknown
) => {
  if (isAxiosError(error) && error.response?.status === 409) {
    await refreshPaymentDependencies(queryClient, reservationId, true);
  }
};

export const usePaymentSummary = (reservationId: number) =>
  useQuery({
    queryKey: paymentWorkflowQueryKeys.summary(reservationId),
    queryFn: () => paymentWorkflowService.getSummary(reservationId),
    enabled: Number.isInteger(reservationId) && reservationId > 0,
    retry: 1,
  });

export const usePaymentLedger = (reservationId: number) =>
  useQuery({
    queryKey: paymentWorkflowQueryKeys.ledger(reservationId),
    queryFn: () => paymentWorkflowService.getLedger(reservationId),
    enabled: Number.isInteger(reservationId) && reservationId > 0,
    retry: 1,
  });

export const useRecordPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reservationId, request }: { reservationId: number; request: RecordPaymentRequest }) =>
      paymentWorkflowService.recordPayment(reservationId, request),
    onSuccess: (_response, variables) => refreshPaymentDependencies(queryClient, variables.reservationId, true),
    onError: (error, variables) => refreshAfterPaymentFailure(queryClient, variables.reservationId, error),
  });
};

export const useCorrectPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reservationId, paymentId, request }: {
      reservationId: number;
      paymentId: number;
      request: CorrectPaymentRequest;
    }) => paymentWorkflowService.correctPayment(reservationId, paymentId, request),
    onSuccess: (_response, variables) => refreshPaymentDependencies(queryClient, variables.reservationId, true),
    onError: (error, variables) => refreshAfterPaymentFailure(queryClient, variables.reservationId, error),
  });
};

export const useReversePayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reservationId, paymentId, request }: {
      reservationId: number;
      paymentId: number;
      request: ReversePaymentRequest;
    }) => paymentWorkflowService.reversePayment(reservationId, paymentId, request),
    onSuccess: (_response, variables) => refreshPaymentDependencies(queryClient, variables.reservationId, true),
    onError: (error, variables) => refreshAfterPaymentFailure(queryClient, variables.reservationId, error),
  });
};
