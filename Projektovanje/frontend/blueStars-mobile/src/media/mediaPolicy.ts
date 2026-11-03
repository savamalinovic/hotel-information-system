export type MediaKind = "image" | "pdf" | "external";

// An extension cannot turn an explicitly unsupported MIME type into active content.
export function getMediaKind(contentType: string | null, filename: string): MediaKind {
  const mime = contentType?.split(";", 1)[0].trim().toLowerCase();
  if (["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"].includes(mime ?? "")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (!mime || mime === "application/octet-stream") {
    if (/\.(jpe?g|png|webp|gif|bmp)$/i.test(filename)) return "image";
    if (/\.pdf$/i.test(filename)) return "pdf";
  }
  return "external";
}

export function requireMediaUrl(value: string, developmentHost?: string): string {
  const url = new URL(value);
  const developmentHttp = Boolean(developmentHost) && url.protocol === "http:" && url.hostname === developmentHost;
  if ((url.protocol !== "https:" && !developmentHttp) || url.username || url.password) {
    throw new Error("Unsupported media URL.");
  }
  return value;
}

export function validateMediaPdf(content: ArrayBuffer): void {
  const bytes = new Uint8Array(content);
  if (bytes.length < 5 || bytes.length > 10 * 1024 * 1024 || String.fromCharCode(...bytes.subarray(0, 5)) !== "%PDF-") {
    throw new Error("Invalid PDF content.");
  }
}
