import axiosInstance from "@/src/api/axiosInstance";
import {
  CorrectPaymentRequest,
  Payment,
  PaymentSummary,
  RecordPaymentRequest,
  ReversePaymentRequest,
} from "@/src/types/types";
import { API_URLS } from "@/src/util/apiConstants";

const toPayment = (payment: Payment): Payment => ({ ...payment, amount: String(payment.amount) });

const toPaymentSummary = (summary: PaymentSummary): PaymentSummary => ({
  ...summary,
  totalDue: String(summary.totalDue),
  netPaid: String(summary.netPaid),
  outstandingBalance: String(summary.outstandingBalance),
});

export const paymentWorkflowQueryKeys = {
  root: ["payment-workflows"] as const,
  summary: (reservationId: number) => ["payment-workflows", "summary", reservationId] as const,
  ledger: (reservationId: number) => ["payment-workflows", "ledger", reservationId] as const,
  recordPayment: (reservationId: number) => ["payment-workflows", "record-payment", reservationId] as const,
  correction: (reservationId: number, paymentId: number) =>
    ["payment-workflows", "correction", reservationId, paymentId] as const,
  reversal: (reservationId: number, paymentId: number) =>
    ["payment-workflows", "reversal", reservationId, paymentId] as const,
};

export const paymentWorkflowService = {
  getSummary: async (reservationId: number): Promise<PaymentSummary> => {
    const response = await axiosInstance.get<PaymentSummary>(API_URLS.paymentWorkflows.summary(reservationId));
    return toPaymentSummary(response.data);
  },

  getLedger: async (reservationId: number): Promise<Payment[]> => {
    const response = await axiosInstance.get<Payment[]>(API_URLS.paymentWorkflows.ledger(reservationId));
    return response.data.map(toPayment);
  },

  recordPayment: async (
    reservationId: number,
    request: RecordPaymentRequest
  ): Promise<Payment> => {
    const response = await axiosInstance.post<Payment>(API_URLS.paymentWorkflows.ledger(reservationId), request);
    return toPayment(response.data);
  },

  correctPayment: async (
    reservationId: number,
    paymentId: number,
    request: CorrectPaymentRequest
  ): Promise<Payment> => {
    const response = await axiosInstance.post<Payment>(
      API_URLS.paymentWorkflows.correction(reservationId, paymentId),
      request
    );
    return toPayment(response.data);
  },

  reversePayment: async (
    reservationId: number,
    paymentId: number,
    request: ReversePaymentRequest
  ): Promise<Payment> => {
    const response = await axiosInstance.post<Payment>(
      API_URLS.paymentWorkflows.reversal(reservationId, paymentId),
      request
    );
    return toPayment(response.data);
  },
};
