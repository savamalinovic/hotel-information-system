import { secureStoreService } from "@/src/services/secureStoreService";

export type StoredPushPreference = {
  token: string;
  enabled: boolean;
};

const preferenceKey = (email: string) =>
  `push-notification-preference:${encodeURIComponent(email.toLowerCase())}`;

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
