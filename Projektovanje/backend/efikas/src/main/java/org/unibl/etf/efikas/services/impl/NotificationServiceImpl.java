package org.unibl.etf.efikas.services.impl;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.unibl.etf.efikas.exceptions.DomainConflictException;
import org.unibl.etf.efikas.models.entities.*;
import org.unibl.etf.efikas.models.requests.*;
import org.unibl.etf.efikas.models.responses.*;
import org.unibl.etf.efikas.repositories.*;
import org.unibl.etf.efikas.services.interfaces.NotificationService;
import java.time.Instant;
import java.util.Collection;

@Service @RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {
    private final NotificationRepository notifications;
    private final NotificationPushTokenRepository tokens;
    private final AppUserRepository users;
    private final ApplicationEventPublisher events;

    @Override @Transactional
    public void addPushToken(String email, PushNotificationTokenRequest request) {
        AppUser user = user(email);
        NotificationPushToken token = tokens.findByPushToken(request.getToken()).orElse(null);
        if (token != null && !token.getUser().getUserId().equals(user.getUserId()))
            throw new DomainConflictException("Push token is already registered to another user.");
        if (token == null) { token = new NotificationPushToken(); token.setPushToken(request.getToken()); token.setUser(user); }
        token.setPlatform(request.getPlatform()); token.setEnabled(true); token.setLastUsedAt(Instant.now()); tokens.save(token);
    }

    @Override @Transactional
    public void toggleNotification(String email, ToggleNotificationRequest request) {
        AppUser user = user(email);
        NotificationPushToken token = tokens.findByPushTokenAndUserUserId(request.getPushToken(), user.getUserId())
                .orElseThrow(() -> new EntityNotFoundException("Push token not found."));
        token.setEnabled(request.isEnabled()); token.setLastUsedAt(Instant.now());
    }

    @Override @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> list(String email, boolean unreadOnly, Pageable pageable) {
        AppUser user = user(email);
        Page<Notification> page = unreadOnly
                ? notifications.findByRecipientUserIdAndReadAtIsNull(user.getUserId(), pageable)
                : notifications.findByRecipientUserId(user.getUserId(), pageable);
        return PageResponse.from(page.map(NotificationServiceImpl::response));
    }

    @Override @Transactional
    public NotificationResponse markRead(String email, Long id) {
        AppUser user = user(email);
        Notification notification = notifications.findByNotificationIdAndRecipientUserId(id, user.getUserId())
                .orElseThrow(() -> new EntityNotFoundException("Notification not found."));
        if (notification.getReadAt() == null) notification.setReadAt(Instant.now());
        return response(notification);
    }

    @Override @Transactional
    public void notify(Collection<AppUser> recipients, String type, String title, String body) {
        recipients.stream().filter(AppUser::isActive).distinct().forEach(recipient -> {
            Notification n = new Notification(); n.setRecipient(recipient); n.setType(type);
            n.setTitle(title); n.setBody(body); notifications.save(n);
            events.publishEvent(new NotificationCreatedEvent(recipient.getUserId(), title, body));
        });
    }

    private AppUser user(String email) { return users.findByEmailIgnoreCase(email)
            .filter(AppUser::isActive).orElseThrow(() -> new EntityNotFoundException("Active user not found.")); }
    private static NotificationResponse response(Notification n) { return new NotificationResponse(
            n.getNotificationId(), n.getType(), n.getTitle(), n.getBody(), n.getCreatedAt(), n.getReadAt()); }
    public record NotificationCreatedEvent(Integer userId, String title, String body) {}
}
