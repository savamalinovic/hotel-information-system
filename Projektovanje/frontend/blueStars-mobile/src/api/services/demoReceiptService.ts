import axiosInstance from "@/src/api/axiosInstance";
import { DemoReceipt } from "@/src/types/types";
import { API_URLS } from "@/src/util/apiConstants";
import { isAxiosError } from "axios";

const PDF_CONTENT_TYPE = /^application\/pdf(?:\s*;|$)/i;

export type DemoReceiptPdf = {
  content: ArrayBuffer;
  filename: string;
};

export type DemoReceiptPdfDownloadFailure = "invalid-status" | "invalid-content-type" | "empty-content";

export class DemoReceiptPdfDownloadError extends Error {
  constructor(public readonly failure: DemoReceiptPdfDownloadFailure) {
    super(failure);
    this.name = "DemoReceiptPdfDownloadError";
  }
}

const toDemoReceipt = (receipt: DemoReceipt): DemoReceipt => ({
  ...receipt,
  nightlyRate: String(receipt.nightlyRate),
  totalAmount: String(receipt.totalAmount),
  vatAmount: String(receipt.vatAmount),
});

const pdfFilename = (receiptNumber: string) => `${receiptNumber}.pdf`;

export const demoReceiptQueryKeys = {
  root: ["demo-receipts"] as const,
  receipt: (reservationId: number) => ["demo-receipts", "metadata", reservationId] as const,
};

export const demoReceiptService = {
  getReceipt: async (reservationId: number): Promise<DemoReceipt | null> => {
    try {
      const response = await axiosInstance.get<DemoReceipt>(API_URLS.demoReceipts.metadata(reservationId));
      return toDemoReceipt(response.data);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        return null;
      }

      throw error;
    }
  },

  generateReceipt: async (reservationId: number): Promise<DemoReceipt> => {
    const response = await axiosInstance.post<DemoReceipt>(API_URLS.demoReceipts.metadata(reservationId));
    return toDemoReceipt(response.data);
  },

  downloadPdf: async (reservationId: number, receiptNumber: string): Promise<DemoReceiptPdf> => {
    const response = await axiosInstance.get<ArrayBuffer>(API_URLS.demoReceipts.pdf(reservationId), {
      responseType: "arraybuffer",
    });
    const contentType = String(response.headers["content-type"] ?? "");

    if (response.status < 200 || response.status >= 300) {
      throw new DemoReceiptPdfDownloadError("invalid-status");
    }

    if (!PDF_CONTENT_TYPE.test(contentType)) {
      throw new DemoReceiptPdfDownloadError("invalid-content-type");
    }

    if (!response.data || response.data.byteLength < 1) {
      throw new DemoReceiptPdfDownloadError("empty-content");
    }

    return { content: response.data, filename: pdfFilename(receiptNumber) };
  },
};
