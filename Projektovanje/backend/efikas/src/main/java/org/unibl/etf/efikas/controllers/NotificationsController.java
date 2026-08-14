package org.unibl.etf.efikas.controllers;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.unibl.etf.efikas.models.dto.NotificationMessageDTO;
import org.unibl.etf.efikas.models.requests.PushNotificationTokenRequest;
import org.unibl.etf.efikas.models.requests.ToggleNotificationRequest;
import org.unibl.etf.efikas.services.interfaces.NotificationService;
import org.unibl.etf.efikas.configs.OpenApiConfig;

@RestController
@RequestMapping("/api/v1/notifications")
@AllArgsConstructor
@Tag(name = "Notifications")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class NotificationsController {
    private final NotificationService notificationService;

    @PostMapping("/push-token")
    public ResponseEntity<?> pushRegistrationToken(@RequestBody PushNotificationTokenRequest pushNotificationTokenRequest) {
        System.out.println("Push token request: " + pushNotificationTokenRequest);
        String resp = notificationService.addPushToken(pushNotificationTokenRequest);

        return ResponseEntity.ok(resp);
    }

    @PostMapping("/send")
    public ResponseEntity<?> sendPushToken(@RequestBody NotificationMessageDTO notificationMessageDTO) {
        System.out.println("Push token request: " + notificationMessageDTO);

        notificationService.sendNotificationByToken(notificationMessageDTO);

        return ResponseEntity.ok("Notification sent successfully");
    }

    @PutMapping("/toggle")
    public ResponseEntity<?> updateNotifications(@RequestBody ToggleNotificationRequest toggleNotificationRequest)
    {
        System.out.println("Toggle notification request: " + toggleNotificationRequest);
        String resp = notificationService.toggleNotification(toggleNotificationRequest);

        return ResponseEntity.ok(resp);
    }
}
