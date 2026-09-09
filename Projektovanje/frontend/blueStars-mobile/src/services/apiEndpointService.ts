import { asyncStorageService } from "@/src/services/asyncStorageService";
import { ASYNC_STORAGE_KEYS } from "@/src/util/secureStoreKeys";

export const API_BASE_PATH = "/api/v1";

const scheme = process.env.EXPO_PUBLIC_API_SCHEME ?? "http";
const address = process.env.EXPO_PUBLIC_API_ADDRESS ?? "localhost";
const port = process.env.EXPO_PUBLIC_API_PORT;
const authority = port ? `${address}:${port}` : address;

const environmentApiRootUrl = `${scheme}://${authority}`;

export const normalizeApiRootUrl = (value: string): string => {
  const input = value.trim();
  if (!input) {
    throw new Error("A backend URL is required.");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(input);
  } catch {
    throw new Error("The backend URL is invalid.");
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("The backend URL must use HTTP or HTTPS.");
  }

  if (parsedUrl.username || parsedUrl.password || parsedUrl.search || parsedUrl.hash) {
    throw new Error("The backend URL must not contain credentials, a query, or a fragment.");
  }

  const pathname = parsedUrl.pathname.replace(/\/+$/, "");
  if (pathname && pathname !== API_BASE_PATH) {
    throw new Error("The backend URL must contain only the scheme, host, and optional port.");
  }

  return parsedUrl.origin;
};

export const DEFAULT_API_ROOT_URL = normalizeApiRootUrl(environmentApiRootUrl);

// This override exists for local/test builds so a physical device can switch
// between development machines without requiring a new application binary.
export const isLocalApiOverrideEnabled =
  process.env.NODE_ENV !== "production" || scheme === "http";

let currentApiRootUrl = DEFAULT_API_ROOT_URL;
let loadPromise: Promise<string> | undefined;

export const apiEndpointService = {
  getRootUrl: () => currentApiRootUrl,

  getBaseUrl: () => `${currentApiRootUrl}${API_BASE_PATH}`,

  load: async (): Promise<string> => {
    if (loadPromise) {
      return loadPromise;
    }

    loadPromise = (async () => {
      const storedUrl = await asyncStorageService.getItemAsync(ASYNC_STORAGE_KEYS.apiRootUrl);
      if (!storedUrl) {
        return currentApiRootUrl;
      }

      try {
        currentApiRootUrl = normalizeApiRootUrl(storedUrl);
      } catch {
        await asyncStorageService.deleteItemAsync(ASYNC_STORAGE_KEYS.apiRootUrl);
      }

      return currentApiRootUrl;
    })();

    return loadPromise;
  },

  setRootUrl: async (value: string): Promise<string> => {
    const normalizedUrl = normalizeApiRootUrl(value);
    await asyncStorageService.setItemAsync(ASYNC_STORAGE_KEYS.apiRootUrl, normalizedUrl);
    currentApiRootUrl = normalizedUrl;
    return currentApiRootUrl;
  },

  resetRootUrl: async (): Promise<string> => {
    await asyncStorageService.deleteItemAsync(ASYNC_STORAGE_KEYS.apiRootUrl);
    currentApiRootUrl = DEFAULT_API_ROOT_URL;
    return currentApiRootUrl;
  },
};
