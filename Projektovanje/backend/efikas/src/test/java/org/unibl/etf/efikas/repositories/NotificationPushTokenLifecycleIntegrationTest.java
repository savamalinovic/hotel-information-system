package org.unibl.etf.efikas.repositories;

import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import org.unibl.etf.efikas.models.entities.AppUser;
import org.unibl.etf.efikas.models.enums.AuditEvent;
import org.unibl.etf.efikas.models.enums.UserRole;
import org.unibl.etf.efikas.models.requests.PushNotificationTokenRequest;
import org.unibl.etf.efikas.models.requests.ToggleNotificationRequest;
import org.unibl.etf.efikas.models.requests.UnregisterPushNotificationTokenRequest;
import org.unibl.etf.efikas.services.interfaces.NotificationService;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class NotificationPushTokenLifecycleIntegrationTest {
    private static final String PUSH_TOKEN = "ExponentPushToken[lifecycle-integration]";

    @Autowired NotificationService notificationService;
    @Autowired AppUserRepository appUsers;
    @Autowired NotificationPushTokenRepository tokens;
    @Autowired AuditLogRepository auditLogs;

    @Test
    void registrationTransfersOneDeviceTokenAndUnregisterIsOwnerScopedAndIdempotent() {
        AppUser firstUser = user("first");
        AppUser secondUser = user("second");
        PushNotificationTokenRequest registration = new PushNotificationTokenRequest(PUSH_TOKEN, "android");

        notificationService.addPushToken(firstUser.getEmail(), registration);
        assertThat(tokens.findByPushToken(PUSH_TOKEN)).get().satisfies(token -> {
            assertThat(token.getUser().getUserId()).isEqualTo(firstUser.getUserId());
            assertThat(token.getEnabled()).isTrue();
            assertThat(token.getPlatform()).isEqualTo("android");
            assertThat(token.getLastUsedAt()).isNotNull();
        });

        notificationService.addPushToken(firstUser.getEmail(), registration);
        assertThat(auditLogs.findAll().stream()
                .filter(log -> log.getActor().getUserId().equals(firstUser.getUserId()))
                .filter(log -> log.getEvent() == AuditEvent.PUSH_TOKEN_REGISTERED))
                .hasSize(1);

        notificationService.addPushToken(secondUser.getEmail(), new PushNotificationTokenRequest(PUSH_TOKEN, "ios"));

        assertThat(tokens.findByUserUserIdAndEnabledTrue(firstUser.getUserId())).isEmpty();
        assertThat(tokens.findByUserUserIdAndEnabledTrue(secondUser.getUserId())).singleElement().satisfies(token -> {
            assertThat(token.getUser().getUserId()).isEqualTo(secondUser.getUserId());
            assertThat(token.getPlatform()).isEqualTo("ios");
            assertThat(token.getEnabled()).isTrue();
        });
        assertThat(tokens.findByPushToken(PUSH_TOKEN)).get().extracting(token -> token.getUser().getUserId())
                .isEqualTo(secondUser.getUserId());

        assertThat(auditLogs.findAll().stream()
                .filter(log -> log.getActor().getUserId().equals(secondUser.getUserId()))
                .filter(log -> log.getEvent() == AuditEvent.PUSH_TOKEN_TRANSFERRED))
                .singleElement()
                .satisfies(log -> assertThat(log.getDetails())
                        .contains("user " + firstUser.getUserId(), "user " + secondUser.getUserId())
                        .doesNotContain(PUSH_TOKEN));

        notificationService.unregisterPushToken(firstUser.getEmail(),
                new UnregisterPushNotificationTokenRequest(PUSH_TOKEN));
        assertThat(tokens.findByPushToken(PUSH_TOKEN)).isPresent();

        notificationService.unregisterPushToken(secondUser.getEmail(),
                new UnregisterPushNotificationTokenRequest(PUSH_TOKEN));
        assertThat(tokens.findByPushToken(PUSH_TOKEN)).isEmpty();

        notificationService.unregisterPushToken(secondUser.getEmail(),
                new UnregisterPushNotificationTokenRequest(PUSH_TOKEN));
        notificationService.unregisterPushToken(secondUser.getEmail(),
                new UnregisterPushNotificationTokenRequest("ExponentPushToken[missing]"));

        assertThat(auditLogs.findAll().stream()
                .filter(log -> log.getActor().getUserId().equals(secondUser.getUserId()))
                .filter(log -> log.getEvent() == AuditEvent.PUSH_TOKEN_UNREGISTERED))
                .singleElement()
                .satisfies(log -> assertThat(log.getDetails()).doesNotContain(PUSH_TOKEN));
    }

    @Test
    void toggleCannotChangeOrTransferAnotherUsersToken() {
        AppUser owner = user("owner");
        AppUser otherUser = user("other");
        notificationService.addPushToken(owner.getEmail(), new PushNotificationTokenRequest(PUSH_TOKEN, "android"));

        assertThatThrownBy(() -> notificationService.toggleNotification(otherUser.getEmail(),
                new ToggleNotificationRequest(PUSH_TOKEN, false)))
                .isInstanceOf(EntityNotFoundException.class);

        assertThat(tokens.findByPushToken(PUSH_TOKEN)).get().satisfies(token -> {
            assertThat(token.getUser().getUserId()).isEqualTo(owner.getUserId());
            assertThat(token.getEnabled()).isTrue();
        });
    }

    private AppUser user(String prefix) {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        AppUser user = new AppUser();
        user.setName("Push");
        user.setSurname("Lifecycle");
        user.setJmbg("9" + suffix);
        user.setPasswordHash("not-a-real-password-hash");
        user.setEmail(prefix + "-" + suffix + "@example.invalid");
        user.setAddress("Test address");
        user.setActive(true);
        user.setRole(UserRole.AGENT);
        return appUsers.saveAndFlush(user);
    }
}
