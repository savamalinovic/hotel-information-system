export type LocalDemoReceiptFile = {
  uri: string;
  filename: string;
};

const activeUrls = new Set<string>();

export const persistDemoReceiptPdf = (content: ArrayBuffer, filename: string): LocalDemoReceiptFile => {
  const blob = new Blob([content], { type: "application/pdf" });
  const uri = URL.createObjectURL(blob);
  activeUrls.add(uri);
  return { uri, filename };
};

export const releaseDemoReceiptPdf = (uri: string | undefined) => {
  if (uri?.startsWith("blob:")) {
    URL.revokeObjectURL(uri);
    activeUrls.delete(uri);
  }
};

export const clearDemoReceiptPdfs = () => {
  for (const uri of activeUrls) URL.revokeObjectURL(uri);
  activeUrls.clear();
};
