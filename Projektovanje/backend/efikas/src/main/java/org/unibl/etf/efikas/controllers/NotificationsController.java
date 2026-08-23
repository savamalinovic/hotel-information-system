package org.unibl.etf.efikas.controllers;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.unibl.etf.efikas.configs.OpenApiConfig;
import org.unibl.etf.efikas.models.requests.*;
import org.unibl.etf.efikas.models.responses.*;
import org.unibl.etf.efikas.services.interfaces.NotificationService;

@RestController @RequestMapping("/api/v1/notifications") @RequiredArgsConstructor
@Tag(name = "Notifications") @SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class NotificationsController {
    private final NotificationService service;
    @GetMapping public PageResponse<NotificationResponse> list(Authentication auth,
            @RequestParam(defaultValue = "false") boolean unreadOnly, Pageable pageable) {
        return service.list(auth.getName(), unreadOnly, pageable);
    }
    @PostMapping("/{id}/read") public NotificationResponse read(Authentication auth, @PathVariable Long id) {
        return service.markRead(auth.getName(), id);
    }
    @PostMapping("/push-token") public ResponseEntity<Void> register(Authentication auth,
            @Valid @RequestBody PushNotificationTokenRequest request) {
        service.addPushToken(auth.getName(), request); return ResponseEntity.noContent().build();
    }
    @PostMapping("/push-token/unregister")
    @ApiResponse(responseCode = "204", description = "The authenticated owner's token is unregistered, if present.")
    public ResponseEntity<Void> unregister(Authentication auth,
            @Valid @RequestBody UnregisterPushNotificationTokenRequest request) {
        service.unregisterPushToken(auth.getName(), request); return ResponseEntity.noContent().build();
    }
    @PutMapping("/toggle") public ResponseEntity<Void> toggle(Authentication auth,
            @Valid @RequestBody ToggleNotificationRequest request) {
        service.toggleNotification(auth.getName(), request); return ResponseEntity.noContent().build();
    }
}
