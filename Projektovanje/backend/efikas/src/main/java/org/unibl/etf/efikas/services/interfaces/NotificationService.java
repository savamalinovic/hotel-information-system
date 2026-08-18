package org.unibl.etf.efikas.services.interfaces;

import org.springframework.data.domain.Pageable;
import org.unibl.etf.efikas.models.entities.AppUser;
import org.unibl.etf.efikas.models.entities.OperationalTask;
import org.unibl.etf.efikas.models.requests.PushNotificationTokenRequest;
import org.unibl.etf.efikas.models.requests.ToggleNotificationRequest;
import org.unibl.etf.efikas.models.responses.NotificationResponse;
import org.unibl.etf.efikas.models.responses.PageResponse;
import java.util.Collection;

public interface NotificationService {
    void addPushToken(String email, PushNotificationTokenRequest request);
    void toggleNotification(String email, ToggleNotificationRequest request);
    PageResponse<NotificationResponse> list(String email, boolean unreadOnly, Pageable pageable);
    NotificationResponse markRead(String email, Long notificationId);
    void notify(Collection<AppUser> recipients, String type, String title, String body);
    void notify(Collection<AppUser> recipients, String type, String title, String body, OperationalTask task);
}
