import axiosInstance from "@/src/api/axiosInstance";
import {
  NotificationItem,
  PageResponse,
  PushNotificationTokenRequest,
  ToggleNotificationRequest,
  UnregisterPushNotificationTokenRequest,
} from "@/src/types/types";
import { API_URLS } from "@/src/util/apiConstants";

export type NotificationInboxFilters = {
  unreadOnly: boolean;
  page: number;
  size: number;
};

const stableSort = ["createdAt,desc", "notificationId,desc"];
const notificationParamsSerializer = { indexes: null };

export const notificationsApiService = {
  getInbox: async (filters: NotificationInboxFilters): Promise<PageResponse<NotificationItem>> => {
    const response = await axiosInstance.get<PageResponse<NotificationItem>>(API_URLS.notifications.list, {
      params: { ...filters, sort: stableSort },
      paramsSerializer: notificationParamsSerializer,
    });
    return response.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const page = await notificationsApiService.getInbox({ unreadOnly: true, page: 0, size: 1 });
    return page.totalElements;
  },

  markAsRead: async (notificationId: number): Promise<NotificationItem> => {
    const response = await axiosInstance.post<NotificationItem>(API_URLS.notifications.markRead(notificationId));
    return response.data;
  },

  registerPushToken: async (request: PushNotificationTokenRequest): Promise<void> => {
    const response = await axiosInstance.post(API_URLS.notifications.pushToken, request);
    if (response.status !== 204) {
      throw new Error(`Unexpected push-token registration status: ${response.status}`);
    }
  },

  unregisterPushToken: async (request: UnregisterPushNotificationTokenRequest): Promise<void> => {
    const response = await axiosInstance.post(API_URLS.notifications.unregisterPushToken, request);
    if (response.status !== 204) {
      throw new Error(`Unexpected push-token unregister status: ${response.status}`);
    }
  },

  toggleNotifications: async (request: ToggleNotificationRequest): Promise<void> => {
    const response = await axiosInstance.put(API_URLS.notifications.toggle, request);
    if (response.status !== 204) {
      throw new Error(`Unexpected push-token toggle status: ${response.status}`);
    }
  },
};
