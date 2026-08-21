import { Directory, File, Paths } from "expo-file-system";

export type LocalDemoReceiptFile = {
  uri: string;
  filename: string;
};

const sanitizeReceiptFilename = (filename: string) => {
  const baseName = filename.replace(/\.pdf$/i, "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return `${(baseName || "demo-receipt").slice(0, 120)}.pdf`;
};

export const persistDemoReceiptPdf = (content: ArrayBuffer, filename: string): LocalDemoReceiptFile => {
  const directory = new Directory(Paths.cache, "demo-receipts");
  const safeFilename = sanitizeReceiptFilename(filename);
  const file = new File(directory, safeFilename);

  try {
    directory.create({ intermediates: true, idempotent: true });
    file.create({ overwrite: true });
    file.write(new Uint8Array(content));

    if (!file.exists || file.size < 1) {
      throw new Error("The PDF cache file is empty.");
    }

    return { uri: file.uri, filename: safeFilename };
  } catch (error) {
    if (file.exists) {
      file.delete();
    }

    throw error;
  }
};

export const releaseDemoReceiptPdf = (uri: string | undefined) => {
  if (!uri) {
    return;
  }

  const file = new File(uri);
  if (file.exists) {
    file.delete();
  }
};
