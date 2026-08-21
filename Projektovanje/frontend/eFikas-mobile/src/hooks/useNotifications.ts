import { notificationsApiService } from "@/src/api/services/notificationsApiService";
import { NotificationItem } from "@/src/types/types";
import { useSession } from "@/src/providers/SessionProvider";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const PAGE_SIZE = 20;

export const notificationQueryKeys = {
  inboxRoot: ["notifications", "inbox"] as const,
  inbox: (unreadOnly: boolean) => ["notifications", "inbox", { unreadOnly }] as const,
  unreadCount: ["notifications", "unread-count"] as const,
};

const canUseInbox = (status: string, role: string | undefined) =>
  status === "authenticated" && (role === "AGENT" || role === "OPERATIONAL_WORKER");

export const useNotificationInbox = (unreadOnly: boolean) => {
  const { status, session } = useSession();
  return useInfiniteQuery({
    queryKey: notificationQueryKeys.inbox(unreadOnly),
    queryFn: ({ pageParam }) => notificationsApiService.getInbox({
      unreadOnly,
      page: pageParam,
      size: PAGE_SIZE,
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.page + 1 < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: canUseInbox(status, session?.role),
    staleTime: 30_000,
    retry: 1,
  });
};

export const useUnreadNotificationCount = () => {
  const { status, session } = useSession();
  return useQuery({
    queryKey: notificationQueryKeys.unreadCount,
    queryFn: notificationsApiService.getUnreadCount,
    enabled: canUseInbox(status, session?.role),
    staleTime: 30_000,
    retry: 1,
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: number) => notificationsApiService.markAsRead(notificationId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: notificationQueryKeys.inboxRoot }),
        queryClient.invalidateQueries({ queryKey: notificationQueryKeys.unreadCount }),
      ]);
    },
  });
};

export const flattenNotifications = (pages: { content: NotificationItem[] }[] | undefined) =>
  pages?.flatMap((page) => page.content) ?? [];
