export type LocalDemoReceiptFile = {
  uri: string;
  filename: string;
};

export const persistDemoReceiptPdf = (content: ArrayBuffer, filename: string): LocalDemoReceiptFile => {
  const blob = new Blob([content], { type: "application/pdf" });
  return { uri: URL.createObjectURL(blob), filename };
};

export const releaseDemoReceiptPdf = (uri: string | undefined) => {
  if (uri?.startsWith("blob:")) {
    URL.revokeObjectURL(uri);
  }
};
