package org.unibl.etf.efikas.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.unibl.etf.efikas.models.entities.NotificationPushToken;

import java.util.Optional;
import java.util.List;

public interface NotificationPushTokenRepository extends JpaRepository<NotificationPushToken, Integer> {
    boolean existsByPushToken(String pushToken);
    Optional<NotificationPushToken> findByPushToken(String pushToken);
    Optional<NotificationPushToken> findByPushTokenAndUserUserId(String pushToken, Integer userId);
    List<NotificationPushToken> findByUserUserIdAndEnabledTrue(Integer userId);
}
