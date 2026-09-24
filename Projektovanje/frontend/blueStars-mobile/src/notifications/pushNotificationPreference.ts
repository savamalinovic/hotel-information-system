import { secureStoreService } from "@/src/services/secureStoreService";

export type StoredPushPreference = {
  token: string;
  enabled: boolean;
};

const PUSH_PREFERENCE_KEY_VERSION = "v1";
const PUSH_PREFERENCE_KEY_PREFIX = `push-notification-preference.${PUSH_PREFERENCE_KEY_VERSION}`;

// This is the initial released key format. It is injective, uses only SecureStore-safe
// characters, and is deliberately versioned so a future format change is explicit.
const encodeKeyPart = (value: string) => Array.from(
  value.trim().toLowerCase(),
  (character) => character.codePointAt(0)?.toString(16) ?? "0"
).join("-");

export const preferenceKey = (email: string) =>
  `${PUSH_PREFERENCE_KEY_PREFIX}.${encodeKeyPart(email)}`;

const isStoredPushPreference = (value: unknown): value is StoredPushPreference =>
  Boolean(value)
  && typeof value === "object"
  && typeof (value as StoredPushPreference).token === "string"
  && typeof (value as StoredPushPreference).enabled === "boolean";

export const pushNotificationPreference = {
  get: async (email: string): Promise<StoredPushPreference | null> => {
    const raw = await secureStoreService.getItemAsync(preferenceKey(email));
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      return isStoredPushPreference(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },

  save: async (email: string, preference: StoredPushPreference): Promise<void> => {
    await secureStoreService.setItemAsync(preferenceKey(email), JSON.stringify(preference));
  },

  clear: async (email: string): Promise<void> => {
    await secureStoreService.deleteItemAsync(preferenceKey(email));
  },
};
