package org.unibl.etf.efikas.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.unibl.etf.efikas.models.enums.ApartmentOperationalStatus;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "apartment_status_history", schema = "efikas")
public class ApartmentStatusHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"ApartmentStatusHistoryId\"", nullable = false)
    private Long apartmentStatusHistoryId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"ApartmentId\"", nullable = false)
    private Apartment apartment;

    @Enumerated(EnumType.STRING)
    @Column(name = "\"Status\"", nullable = false, length = 32)
    private ApartmentOperationalStatus status;

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
