import {
  demoReceiptQueryKeys,
  demoReceiptService,
} from "@/src/api/services/demoReceiptService";
import { paymentWorkflowQueryKeys } from "@/src/api/services/paymentWorkflowService";
import { reservationWorkflowQueryKeys } from "@/src/api/services/reservationWorkflowService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const isValidReservationId = (reservationId: number) =>
  Number.isInteger(reservationId) && reservationId > 0;

const invalidateReceiptDependencies = async (
  queryClient: ReturnType<typeof useQueryClient>,
  reservationId: number
) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: demoReceiptQueryKeys.root }),
    queryClient.invalidateQueries({ queryKey: demoReceiptQueryKeys.receipt(reservationId) }),
    queryClient.invalidateQueries({ queryKey: reservationWorkflowQueryKeys.root }),
    queryClient.invalidateQueries({ queryKey: reservationWorkflowQueryKeys.reservation(reservationId) }),
    queryClient.invalidateQueries({ queryKey: reservationWorkflowQueryKeys.statusHistory(reservationId) }),
    queryClient.invalidateQueries({ queryKey: paymentWorkflowQueryKeys.root }),
    queryClient.invalidateQueries({ queryKey: paymentWorkflowQueryKeys.summary(reservationId) }),
    queryClient.invalidateQueries({ queryKey: paymentWorkflowQueryKeys.ledger(reservationId) }),
    queryClient.invalidateQueries({ queryKey: ["agent-dashboard"] }),
  ]);
};

export const useDemoReceipt = (reservationId: number) =>
  useQuery({
    queryKey: demoReceiptQueryKeys.receipt(reservationId),
    queryFn: () => demoReceiptService.getReceipt(reservationId),
    enabled: isValidReservationId(reservationId),
    retry: 1,
  });

export const useGenerateDemoReceipt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reservationId: number) => demoReceiptService.generateReceipt(reservationId),
    onSuccess: async (receipt) => {
      queryClient.setQueryData(demoReceiptQueryKeys.receipt(receipt.reservationId), receipt);
      await invalidateReceiptDependencies(queryClient, receipt.reservationId);
    },
  });
};
