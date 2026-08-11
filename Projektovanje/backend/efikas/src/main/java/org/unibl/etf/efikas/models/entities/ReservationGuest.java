package org.unibl.etf.efikas.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "reservation_guest", schema = "efikas")
public class ReservationGuest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"ReservationGuestId\"", nullable = false)
    private Long reservationGuestId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"ReservationId\"", nullable = false)
    private Reservation reservation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"GuestId\"", nullable = false)
    private Guest guest;

    @Column(name = "\"PrimaryGuest\"", nullable = false)
    private boolean primaryGuest;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"AddedBy\"", nullable = false)
    private AppUser addedBy;

    @CreationTimestamp
    @Column(name = "\"CreatedAt\"", nullable = false, updatable = false)
    private Instant createdAt;
}
