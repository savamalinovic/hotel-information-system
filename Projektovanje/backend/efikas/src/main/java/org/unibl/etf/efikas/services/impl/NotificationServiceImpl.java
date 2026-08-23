package org.unibl.etf.efikas.services.impl;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.unibl.etf.efikas.models.entities.*;
import org.unibl.etf.efikas.models.enums.AuditEvent;
import org.unibl.etf.efikas.models.requests.*;
import org.unibl.etf.efikas.models.responses.*;
import org.unibl.etf.efikas.repositories.*;
import org.unibl.etf.efikas.services.AuditLogService;
import org.unibl.etf.efikas.services.interfaces.NotificationService;
import java.time.Instant;
import java.util.Collection;

@Service @RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {
    private final NotificationRepository notifications;
    private final NotificationPushTokenRepository tokens;
    private final AppUserRepository users;
    private final ApplicationEventPublisher events;
    private final AuditLogService auditLogService;

    @Override @Transactional
    public void addPushToken(String email, PushNotificationTokenRequest request) {
        AppUser user = user(email);
        tokens.lockByPushToken(request.getToken());
        NotificationPushToken token = tokens.findByPushToken(request.getToken()).orElse(null);
        if (token == null) {
            token = new NotificationPushToken();
            token.setPushToken(request.getToken());
            token.setUser(user);
            token.setPlatform(request.getPlatform());
            token.setEnabled(true);
            token.setLastUsedAt(Instant.now());
            tokens.saveAndFlush(token);
            auditLogService.record(AuditEvent.PUSH_TOKEN_REGISTERED, user, null, null, null,
                    "Push token registered.");
            return;
        }

        Integer previousOwnerId = token.getUser().getUserId();
        boolean ownershipChanged = !previousOwnerId.equals(user.getUserId());
        boolean enabledChanged = !Boolean.TRUE.equals(token.getEnabled());
        token.setUser(user);
        token.setPlatform(request.getPlatform());
        token.setEnabled(true);
        token.setLastUsedAt(Instant.now());

        if (ownershipChanged) {
            auditLogService.record(AuditEvent.PUSH_TOKEN_TRANSFERRED, user, null, null, null,
                    "Push token ownership transferred from user " + previousOwnerId + " to user "
                            + user.getUserId() + ".");
        } else if (enabledChanged) {
            auditLogService.record(AuditEvent.PUSH_TOKEN_REGISTERED, user, null, null, null,
                    "Push token registered.");
        }
    }

    @Override @Transactional
    public void unregisterPushToken(String email, UnregisterPushNotificationTokenRequest request) {
        AppUser user = user(email);
        tokens.lockByPushToken(request.getToken());
        tokens.findByPushTokenAndUserUserId(request.getToken(), user.getUserId()).ifPresent(token -> {
            tokens.delete(token);
            auditLogService.record(AuditEvent.PUSH_TOKEN_UNREGISTERED, user, null, null, null,
                    "Push token unregistered.");
        });
    }

    @Override @Transactional
    public void toggleNotification(String email, ToggleNotificationRequest request) {
        AppUser user = user(email);
        tokens.lockByPushToken(request.getPushToken());
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
        notify(recipients, type, title, body, null);
    }

    @Override @Transactional
    public void notify(Collection<AppUser> recipients, String type, String title, String body, OperationalTask task) {
        recipients.stream().filter(AppUser::isActive).distinct().forEach(recipient -> {
            Notification n = new Notification(); n.setRecipient(recipient); n.setType(type);
            n.setTitle(title); n.setBody(body); n.setTask(task);
            Notification saved = notifications.saveAndFlush(n);
            events.publishEvent(new NotificationCreatedEvent(
                    saved.getNotificationId(), recipient.getUserId(), type, title, body,
                    task == null ? null : task.getTaskId()));
        });
    }

    private AppUser user(String email) { return users.findByEmailIgnoreCase(email)
            .filter(AppUser::isActive).orElseThrow(() -> new EntityNotFoundException("Active user not found.")); }
    private static NotificationResponse response(Notification n) { return new NotificationResponse(
            n.getNotificationId(), n.getType(), n.getTitle(), n.getBody(), n.getCreatedAt(), n.getReadAt(),
            n.getTask() == null ? null : n.getTask().getTaskId()); }
    public record NotificationCreatedEvent(Long notificationId, Integer userId, String type, String title,
                                           String body, Long taskId) {}
}
