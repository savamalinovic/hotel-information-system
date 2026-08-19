package org.unibl.etf.efikas.services;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.client.RestClient;
import org.unibl.etf.efikas.repositories.NotificationPushTokenRepository;
import org.unibl.etf.efikas.services.impl.NotificationServiceImpl.NotificationCreatedEvent;
import org.unibl.etf.efikas.util.Constants;
import java.util.LinkedHashMap;
import java.util.Map;

@Component @RequiredArgsConstructor
public class NotificationPushDispatcher {
    private static final Logger log = LoggerFactory.getLogger(NotificationPushDispatcher.class);
    private final NotificationPushTokenRepository tokens;
    private final RestClient expoRestClient;

    @Async("customAsyncExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void dispatch(NotificationCreatedEvent event) {
        tokens.findByUserUserIdAndEnabledTrue(event.userId()).forEach(token -> {
            try {
                expoRestClient.post().uri(Constants.Expo.PUSH_NOTIFICATION_URI)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(payload(token.getPushToken(), event))
                        .retrieve().toBodilessEntity();
            } catch (RuntimeException ex) {
                log.warn("Push delivery failed for token {}", token.getId(), ex);
            }
        });
    }

    static Map<String, Object> payload(String token, NotificationCreatedEvent event) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("notificationId", event.notificationId());
        data.put("type", event.type());
        if (event.taskId() != null) data.put("taskId", event.taskId());

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("to", token);
        payload.put("title", event.title());
        payload.put("body", event.body());
        payload.put("android", Map.of("channelId", "default"));
        payload.put("data", data);
        return payload;
    }
}
