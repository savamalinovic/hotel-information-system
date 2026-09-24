import { useMutation } from "@tanstack/react-query";
import { notificationsApiService } from "../api/services/notificationsApiService";
import { PushNotificationTokenRequest } from "@/src/types/types";

export const useRegisterNotifications = () => {
    return useMutation({
        mutationFn: (request: PushNotificationTokenRequest) => notificationsApiService.registerPushToken(request),
    });
};
