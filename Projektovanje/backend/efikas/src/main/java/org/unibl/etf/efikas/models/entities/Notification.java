package org.unibl.etf.efikas.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Getter @Setter @Entity
@Table(name = "notification", schema = "efikas")
public class Notification {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"NotificationId\"") private Long notificationId;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"RecipientId\"", nullable = false) private AppUser recipient;
    @Column(name = "\"Type\"", nullable = false, length = 64) private String type;
    @Column(name = "\"Title\"", nullable = false, length = 160) private String title;
    @Column(name = "\"Body\"", nullable = false, length = 1000) private String body;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"TaskId\"") private OperationalTask task;
    @Column(name = "\"CreatedAt\"", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "\"ReadAt\"") private Instant readAt;
    @PrePersist void create() { if (createdAt == null) createdAt = Instant.now(); }
}
