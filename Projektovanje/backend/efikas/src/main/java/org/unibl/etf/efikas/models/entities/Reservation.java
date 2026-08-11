package org.unibl.etf.efikas.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.unibl.etf.efikas.models.enums.ReservationStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "reservation", schema = "efikas")
public class Reservation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"ReservationId\"", nullable = false)
    private Integer reservationId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"ApartmentId\"", nullable = false)
    private Apartment apartment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"GuestId\"")
    private GuestsBook guest;

    @Column(name = "\"GuestQuantity\"", nullable = false)
    private Integer guestQuantity;

    @Column(name = "\"CheckInDate\"", nullable = false)
    private LocalDate checkInDate;

    @Column(name = "\"CheckOutDate\"", nullable = false)
    private LocalDate checkOutDate;

    @Column(name = "\"NightlyRate\"", nullable = false, precision = 12, scale = 2)
    private BigDecimal nightlyRate;

    @Column(name = "\"Note\"", length = 256)
    private String note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"TypeId\"")
    private ReservationType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "\"Status\"", nullable = false, length = 32)
    private ReservationStatus status = ReservationStatus.CONFIRMED;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"CreatedBy\"", nullable = false)
    private AppUser createdBy;

    @Version
    @Column(name = "\"Version\"", nullable = false)
    private Long version;

    @Column(name = "\"CreatedAt\"", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "\"UpdatedAt\"", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

}
