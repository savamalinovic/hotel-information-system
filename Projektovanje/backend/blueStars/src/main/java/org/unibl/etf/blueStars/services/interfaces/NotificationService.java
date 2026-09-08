package org.unibl.etf.blueStars.services.interfaces;

import org.springframework.data.domain.Pageable;
import org.unibl.etf.blueStars.models.entities.AppUser;
import org.unibl.etf.blueStars.models.entities.OperationalTask;
import org.unibl.etf.blueStars.models.requests.PushNotificationTokenRequest;
import org.unibl.etf.blueStars.models.requests.ToggleNotificationRequest;
import org.unibl.etf.blueStars.models.requests.UnregisterPushNotificationTokenRequest;
import org.unibl.etf.blueStars.models.responses.NotificationResponse;
import org.unibl.etf.blueStars.models.responses.PageResponse;
import java.util.Collection;

public interface NotificationService {
    void addPushToken(String email, PushNotificationTokenRequest request);
    void unregisterPushToken(String email, UnregisterPushNotificationTokenRequest request);
    void toggleNotification(String email, ToggleNotificationRequest request);
    PageResponse<NotificationResponse> list(String email, boolean unreadOnly, Pageable pageable);
    NotificationResponse markRead(String email, Long notificationId);
    void notify(Collection<AppUser> recipients, String type, String title, String body);
    void notify(Collection<AppUser> recipients, String type, String title, String body, OperationalTask task);
}
