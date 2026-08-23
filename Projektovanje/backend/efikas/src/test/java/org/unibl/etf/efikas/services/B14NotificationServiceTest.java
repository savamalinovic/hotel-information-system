package org.unibl.etf.efikas.services;

import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.client.RestClient;
import org.unibl.etf.efikas.models.entities.*;
import org.unibl.etf.efikas.models.enums.AuditEvent;
import org.unibl.etf.efikas.models.requests.*;
import org.unibl.etf.efikas.repositories.*;
import org.unibl.etf.efikas.services.AuditLogService;
import org.unibl.etf.efikas.services.impl.NotificationServiceImpl;
import org.unibl.etf.efikas.services.impl.NotificationServiceImpl.NotificationCreatedEvent;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class B14NotificationServiceTest {
    @Mock NotificationRepository notifications;
    @Mock NotificationPushTokenRepository tokens;
    @Mock AppUserRepository users;
    @Mock ApplicationEventPublisher events;
    @Mock AuditLogService auditLogService;
    NotificationServiceImpl service;
    AppUser user;

    @BeforeEach void setup() {
        service = new NotificationServiceImpl(notifications, tokens, users, events, auditLogService);
        user = new AppUser(); user.setUserId(7); user.setEmail("user@example.test"); user.setActive(true);
        lenient().when(users.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));
    }

    @Test void listsOnlyAuthenticatedUsersUnreadNotifications() {
        Notification n = notification(12L, null);
        when(notifications.findByRecipientUserIdAndReadAtIsNull(7, PageRequest.of(0, 20)))
                .thenReturn(new PageImpl<>(List.of(n)));
        var result = service.list(user.getEmail(), true, PageRequest.of(0, 20));
        assertThat(result.content()).singleElement().extracting("notificationId").isEqualTo(12L);
        verify(notifications).findByRecipientUserIdAndReadAtIsNull(7, PageRequest.of(0, 20));
    }

    @Test void markReadIsOwnedAndIdempotent() {
        Notification n = notification(12L, null);
        when(notifications.findByNotificationIdAndRecipientUserId(12L, 7)).thenReturn(Optional.of(n));
        assertThat(service.markRead(user.getEmail(), 12L).readAt()).isNotNull();
        Instant first = n.getReadAt();
        service.markRead(user.getEmail(), 12L);
        assertThat(n.getReadAt()).isEqualTo(first);
        when(notifications.findByNotificationIdAndRecipientUserId(13L, 7)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.markRead(user.getEmail(), 13L)).isInstanceOf(EntityNotFoundException.class);
    }

    @Test void tokenRegistrationUsesAuthenticatedIdentity() {
        var request = new PushNotificationTokenRequest("ExponentPushToken[test]", "android");
        when(tokens.findByPushToken(request.getToken())).thenReturn(Optional.empty());
        service.addPushToken(user.getEmail(), request);
        verify(tokens).saveAndFlush(argThat(token -> token.getUser() == user && token.getEnabled()
                && token.getPlatform().equals("android")));
        verify(auditLogService).record(eq(AuditEvent.PUSH_TOKEN_REGISTERED), same(user), isNull(), isNull(), isNull(),
                eq("Push token registered."));
    }

    @Test void tokenRegistrationTransfersOwnershipWithoutRecordingTheToken() {
        AppUser previousOwner = new AppUser(); previousOwner.setUserId(8); previousOwner.setActive(true);
        NotificationPushToken existing = new NotificationPushToken();
        existing.setUser(previousOwner); existing.setPushToken("ExponentPushToken[test]");
        existing.setPlatform("ios"); existing.setEnabled(true);
        var request = new PushNotificationTokenRequest("ExponentPushToken[test]", "android");
        when(tokens.findByPushToken(request.getToken())).thenReturn(Optional.of(existing));

        service.addPushToken(user.getEmail(), request);

        assertThat(existing.getUser()).isSameAs(user);
        assertThat(existing.getPlatform()).isEqualTo("android");
        assertThat(existing.getEnabled()).isTrue();
        verify(auditLogService).record(eq(AuditEvent.PUSH_TOKEN_TRANSFERRED), same(user), isNull(), isNull(), isNull(),
                argThat(details -> details.contains("user 8") && details.contains("user 7")
                        && !details.contains("ExponentPushToken")));
    }

    @Test void sameOwnerRefreshDoesNotCreateAnotherAuditRecord() {
        NotificationPushToken existing = new NotificationPushToken();
        existing.setUser(user); existing.setPushToken("ExponentPushToken[test]");
        existing.setPlatform("android"); existing.setEnabled(true);
        var request = new PushNotificationTokenRequest("ExponentPushToken[test]", "android");
        when(tokens.findByPushToken(request.getToken())).thenReturn(Optional.of(existing));

        service.addPushToken(user.getEmail(), request);

        verifyNoInteractions(auditLogService);
    }

    @Test void unregisterIsOwnerScopedAndIdempotent() {
        NotificationPushToken owned = new NotificationPushToken();
        owned.setUser(user); owned.setPushToken("ExponentPushToken[test]");
        when(tokens.findByPushTokenAndUserUserId("ExponentPushToken[test]", 7)).thenReturn(Optional.of(owned));

        service.unregisterPushToken(user.getEmail(), new UnregisterPushNotificationTokenRequest("ExponentPushToken[test]"));
        service.unregisterPushToken(user.getEmail(), new UnregisterPushNotificationTokenRequest("ExponentPushToken[missing]"));

        verify(tokens).delete(owned);
        verify(auditLogService).record(eq(AuditEvent.PUSH_TOKEN_UNREGISTERED), same(user), isNull(), isNull(), isNull(),
                argThat(details -> !details.contains("ExponentPushToken")));
    }

    @Test void toggleCannotChangeAnotherUsersToken() {
        when(tokens.findByPushTokenAndUserUserId("ExponentPushToken[other]", 7)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.toggleNotification(user.getEmail(),
                new ToggleNotificationRequest("ExponentPushToken[other]", true)))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test void taskNotificationPublishesTheSavedNotificationAndDeepLinkIds() {
        OperationalTask task = new OperationalTask(); task.setTaskId(456L);
        when(notifications.saveAndFlush(any())).thenAnswer(invocation -> {
            Notification notification = invocation.getArgument(0);
            notification.setNotificationId(123L);
            return notification;
        });

        service.notify(List.of(user), TaskNotificationService.TASK_AVAILABLE,
                "Novi zadatak je dostupan", "Provjera — Inspekcija", task);

        var event = org.mockito.ArgumentCaptor.forClass(NotificationCreatedEvent.class);
        verify(events).publishEvent(event.capture());
        assertThat(event.getValue()).isEqualTo(new NotificationCreatedEvent(
                123L, 7, TaskNotificationService.TASK_AVAILABLE,
                "Novi zadatak je dostupan", "Provjera — Inspekcija", 456L));
        verify(notifications).saveAndFlush(argThat(notification -> notification.getTask() == task));
    }

    @Test @SuppressWarnings("unchecked") void taskPushPayloadIncludesTheDeepLinkData() {
        NotificationCreatedEvent event = new NotificationCreatedEvent(
                123L, 7, TaskNotificationService.TASK_AVAILABLE,
                "Novi zadatak je dostupan", "Provjera — Inspekcija", 456L);

        var payload = NotificationPushDispatcher.payload("ExponentPushToken[test]", event);

        assertThat(payload).containsEntry("to", "ExponentPushToken[test]")
                .containsEntry("title", "Novi zadatak je dostupan")
                .containsEntry("body", "Provjera — Inspekcija");
        java.util.Map<String, Object> data = (java.util.Map<String, Object>) payload.get("data");
        assertThat(data).containsEntry("notificationId", 123L)
                .containsEntry("type", TaskNotificationService.TASK_AVAILABLE)
                .containsEntry("taskId", 456L);
        assertThat(payload.get("android")).isEqualTo(java.util.Map.of("channelId", "default"));
    }

    @Test void pushDeliveryFailureDoesNotEscapeTheAfterCommitDispatcher() {
        NotificationPushToken token = new NotificationPushToken(); token.setId(9);
        NotificationCreatedEvent event = new NotificationCreatedEvent(123L, 7,
                TaskNotificationService.TASK_AVAILABLE, "Title", "Body", 456L);
        when(tokens.findByUserUserIdAndEnabledTrue(7)).thenReturn(List.of(token));
        RestClient expo = mock(RestClient.class);
        when(expo.post()).thenThrow(new RuntimeException("Expo unavailable"));

        assertThatCode(() -> new NotificationPushDispatcher(tokens, expo).dispatch(event)).doesNotThrowAnyException();
    }

    private Notification notification(Long id, Instant readAt) {
        Notification n = new Notification(); n.setNotificationId(id); n.setRecipient(user); n.setType("TEST");
        n.setTitle("Title"); n.setBody("Body"); n.setCreatedAt(Instant.now()); n.setReadAt(readAt); return n;
    }
}
