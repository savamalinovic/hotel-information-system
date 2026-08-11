package org.unibl.etf.efikas.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.unibl.etf.efikas.models.enums.ReservationStatus;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "reservation_status_history", schema = "efikas")
public class ReservationStatusHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"ReservationStatusHistoryId\"", nullable = false)
    private Long reservationStatusHistoryId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"ReservationId\"", nullable = false)
    private Reservation reservation;

    @Enumerated(EnumType.STRING)
    @Column(name = "\"Status\"", nullable = false, length = 32)
    private ReservationStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"ChangedBy\"")
    private AppUser changedBy;

    @Column(name = "\"Reason\"", nullable = false, length = 300)
    private String reason;

    @Column(name = "\"ChangedAt\"", nullable = false, updatable = false)
    private Instant changedAt;

    @PrePersist
    void onCreate() {
        changedAt = Instant.now();
    }
}
