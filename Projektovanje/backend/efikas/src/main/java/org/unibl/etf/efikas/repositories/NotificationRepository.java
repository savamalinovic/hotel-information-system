package org.unibl.etf.efikas.repositories;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.unibl.etf.efikas.models.entities.Notification;
import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    Page<Notification> findByRecipientUserId(Integer userId, Pageable pageable);
    Page<Notification> findByRecipientUserIdAndReadAtIsNull(Integer userId, Pageable pageable);
    Optional<Notification> findByNotificationIdAndRecipientUserId(Long notificationId, Integer userId);
    List<Notification> findByTaskTaskId(Long taskId);
}
