import { notificationsApiService } from "@/src/api/services/notificationsApiService";
import { pushNotificationPreference, StoredPushPreference } from "@/src/notifications/pushNotificationPreference";
import { useSession } from "@/src/providers/SessionProvider";
import { PushAvailability, PushSetupError, notificationsService } from "@/src/services/notificationsService";
import { sessionStore } from "@/src/session/sessionStore";
import { useCallback, useEffect, useState } from "react";

export const usePushNotificationSettings = () => {
  const { session, status } = useSession();
  const email = status === "authenticated" ? session?.email : undefined;
  const sessionToken = status === "authenticated" ? session?.token : undefined;
  const [availability, setAvailability] = useState<PushAvailability>("web");
  const [preference, setPreference] = useState<StoredPushPreference | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(email));
  const [isUpdating, setIsUpdating] = useState(false);

  const refresh = useCallback(async () => {
    if (!email) {
      setPreference(null);
      setAvailability("web");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [nextAvailability, nextPreference] = await Promise.all([
        notificationsService.getAvailability(),
        pushNotificationPreference.get(email),
      ]);
      setAvailability(nextAvailability);
      setPreference(nextPreference);
    } finally {
      setIsLoading(false);
    }
  }, [email]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setEnabled = useCallback(async (enabled: boolean) => {
    const isCurrentSession = () => sessionStore.getSession()?.token === sessionToken;
    if (!email || !sessionToken || !isCurrentSession() || isUpdating) return;
    setIsUpdating(true);
    try {
      if (!enabled) {
        if (preference) {
          await notificationsApiService.toggleNotifications({ pushToken: preference.token, enabled: false });
          const nextPreference = { ...preference, enabled: false };
          await pushNotificationPreference.save(email, nextPreference);
          setPreference(nextPreference);
        }
        return;
      }

      const { token, platform } = await notificationsService.requestPushToken();
      if (!isCurrentSession()) return;
      if (preference?.token === token && preference.enabled) {
        return;
      }
      if (preference?.token === token && preference.enabled === false) {
        await notificationsApiService.toggleNotifications({ pushToken: token, enabled: true });
      } else {
        await notificationsApiService.registerPushToken({ token, platform });
      }

      const nextPreference = { token, enabled: true };
      await pushNotificationPreference.save(email, nextPreference);
      setPreference(nextPreference);
      setAvailability("ready");
    } finally {
      setIsUpdating(false);
    }
  }, [email, isUpdating, preference, sessionToken]);

  return {
    availability,
    enabled: preference?.enabled ?? false,
    hasStoredPreference: preference !== null,
    isLoading,
    isUpdating,
    refresh,
    setEnabled,
    isPushSetupError: (error: unknown) => error instanceof PushSetupError,
  };
};
