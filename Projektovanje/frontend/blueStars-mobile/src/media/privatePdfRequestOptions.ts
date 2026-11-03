export function privatePdfRequestOptions(platform: string, signal: AbortSignal): RequestInit {
  return {
    signal,
    credentials: "omit",
    // React Native's fetch polyfill adds a query parameter for RequestInit.cache,
    // invalidating private storage signatures. A header preserves the signed URL.
    ...(platform === "web" ? { cache: "no-store" as const } : { headers: { "Cache-Control": "no-store" } }),
  };
}
