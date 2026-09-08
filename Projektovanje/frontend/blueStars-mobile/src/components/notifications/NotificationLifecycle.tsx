import { notificationsApiService } from "@/src/api/services/notificationsApiService";
import { notificationQueryKeys } from "@/src/hooks/useNotifications";
import { canOpenWorkerTask, parseNotificationPushData } from "@/src/notifications/notificationNavigation";
import { useSession } from "@/src/providers/SessionProvider";
import { notificationsService } from "@/src/services/notificationsService";
import { AuthenticationResponse } from "@/src/types/types";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useRef } from "react";

const sessionIdentity = (session: AuthenticationResponse) => `${session.email}:${session.token}`;

export default function NotificationLifecycle() {
  const { status, session } = useSession();
  const queryClient = useQueryClient();
  const currentSession = useRef<AuthenticationResponse | null>(null);
  const responseHandler = useRef<((response: Notifications.NotificationResponse) => Promise<void>) | undefined>(undefined);
  const handledResponses = useRef(new Set<string>());
  const initialSessionResolved = useRef(false);
  const startedWithStoredSession = useRef(false);

  useEffect(() => {
    currentSession.current = status === "authenticated" ? session : null;
    handledResponses.current.clear();
  }, [session, status]);

  const invalidateInbox = useCallback(() =>
    queryClient.invalidateQueries({ queryKey: notificationQueryKeys.inboxRoot }), [queryClient]);

  const handleResponse = useCallback(async (response: Notifications.NotificationResponse) => {
    const activeSession = currentSession.current;
    if (!activeSession) return;

    const data = parseNotificationPushData(response.notification.request.content.data);
    const responseId = response.notification.request.identifier
      || `${data.notificationId ?? "none"}:${data.type ?? "unknown"}:${data.taskId ?? "none"}`;
    const dedupeKey = `${sessionIdentity(activeSession)}:${responseId}`;
    if (handledResponses.current.has(dedupeKey)) return;
    handledResponses.current.add(dedupeKey);

    if (data.notificationId !== null) {
      try {
        await notificationsApiService.markAsRead(data.notificationId);
      } catch {
        // Reading is retried from the inbox; it never prevents viewing the notification target.
      } finally {
        await invalidateInbox();
        await queryClient.invalidateQueries({ queryKey: notificationQueryKeys.unreadCount });
      }
    }

    if (currentSession.current && sessionIdentity(currentSession.current) !== sessionIdentity(activeSession)) {
      return;
    }

    if (canOpenWorkerTask(activeSession.role, data.type, data.taskId)) {
      router.push({ pathname: "/(worker)/tasks/[id]", params: { id: String(data.taskId) } });
      return;
    }

    if (activeSession.role === "AGENT") {
      router.push("/(menu)/(profile)/notifications");
    } else if (activeSession.role === "OPERATIONAL_WORKER") {
      router.push("/(worker)/notifications");
    }
  }, [invalidateInbox, queryClient]);

  useEffect(() => {
    responseHandler.current = handleResponse;
  }, [handleResponse]);

  useEffect(() => {
    if (!notificationsService.isNativePushPlatform()) return;

    const receivedSubscription = Notifications.addNotificationReceivedListener(() => {
      if (currentSession.current) {
        void invalidateInbox();
        void queryClient.invalidateQueries({ queryKey: notificationQueryKeys.unreadCount });
      }
    });
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      void responseHandler.current?.(response);
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [invalidateInbox, queryClient]);

  useEffect(() => {
    if (status === "bootstrapping" || initialSessionResolved.current) return;
    initialSessionResolved.current = true;
    startedWithStoredSession.current = status === "authenticated" && Boolean(session);
  }, [session, status]);

  useEffect(() => {
    if (
      !notificationsService.isNativePushPlatform()
      || !startedWithStoredSession.current
      || status !== "authenticated"
      || !session
    ) return;

    startedWithStoredSession.current = false;
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) void responseHandler.current?.(response);
    }).catch(() => {
      // A missing last response must not affect the authenticated session.
    });
  }, [session, status]);

  return null;
}
