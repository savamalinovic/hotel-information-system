package org.unibl.etf.efikas.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.unibl.etf.efikas.models.enums.CheckInClaimAction;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "reservation_check_in_claim_history", schema = "efikas")
public class ReservationCheckInClaimHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"ReservationCheckInClaimHistoryId\"", nullable = false)
    private Long reservationCheckInClaimHistoryId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"ReservationId\"", nullable = false)
    private Reservation reservation;

    @Enumerated(EnumType.STRING)
    @Column(name = "\"Action\"", nullable = false, length = 32)
    private CheckInClaimAction action;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"PreviousClaimedBy\"")
    private AppUser previousClaimedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"ClaimedBy\"")
    private AppUser claimedBy;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"PerformedBy\"", nullable = false)
    private AppUser performedBy;

    @CreationTimestamp
    @Column(name = "\"PerformedAt\"", nullable = false, updatable = false)
    private Instant performedAt;
}
