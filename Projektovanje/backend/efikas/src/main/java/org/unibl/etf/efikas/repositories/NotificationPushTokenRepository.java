package org.unibl.etf.efikas.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.unibl.etf.efikas.models.entities.NotificationPushToken;

import java.util.Optional;
import java.util.List;

public interface NotificationPushTokenRepository extends JpaRepository<NotificationPushToken, Integer> {
    boolean existsByPushToken(String pushToken);
    Optional<NotificationPushToken> findByPushToken(String pushToken);
    Optional<NotificationPushToken> findByPushTokenAndUserUserId(String pushToken, Integer userId);
    List<NotificationPushToken> findByUserUserIdAndEnabledTrue(Integer userId);

    /**
     * Serializes lifecycle changes for one logical Expo token, including the first registration
     * where no row exists yet. The token is a bound SQL parameter and is never persisted here.
     */
    @Query(value = """
            SELECT 1
            FROM (SELECT pg_advisory_xact_lock(hashtext(CAST(:pushToken AS text)))) AS token_lock
            """, nativeQuery = true)
    Integer lockByPushToken(@Param("pushToken") String pushToken);
}
