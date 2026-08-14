package org.unibl.etf.efikas.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "apartment_unavailability", schema = "efikas")
public class ApartmentUnavailability {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"ApartmentUnavailabilityId\"", nullable = false)
    private Long apartmentUnavailabilityId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"ApartmentId\"", nullable = false)
    private Apartment apartment;

    @Column(name = "\"StartDate\"", nullable = false)
    private LocalDate startDate;

    @Column(name = "\"EndDate\"", nullable = false)
    private LocalDate endDate;

    @Column(name = "\"Reason\"", nullable = false, length = 300)
    private String reason;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"CreatedBy\"", nullable = false)
    private AppUser createdBy;

    @Column(name = "\"CreatedAt\"", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
