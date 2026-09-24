package org.unibl.etf.blueStars.models.entities;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;
import org.unibl.etf.blueStars.models.enums.AuditEvent;

import java.time.Instant;

@Getter
@Entity
@Immutable
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "audit_log", schema = "efikas")
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"AuditLogId\"")
    private Long auditLogId;

    @Enumerated(EnumType.STRING)
    @Column(name = "\"Event\"", nullable = false, length = 64)
    private AuditEvent event;

    @Column(name = "\"OccurredAt\"", nullable = false, updatable = false)
    private Instant occurredAt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"ActorId\"", nullable = false, updatable = false)
    private AppUser actor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"ReservationId\"", updatable = false)
    private Reservation reservation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"ApartmentId\"", updatable = false)
    private Apartment apartment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"TaskId\"", updatable = false)
    private OperationalTask task;

    @Column(name = "\"Details\"", length = 500, updatable = false)
    private String details;

    public AuditLog(AuditEvent event, AppUser actor, Reservation reservation,
                    Apartment apartment, OperationalTask task, String details) {
        this.event = event;
        this.actor = actor;
        this.reservation = reservation;
        this.apartment = apartment;
        this.task = task;
        this.details = details;
        this.occurredAt = Instant.now();
    }
}
