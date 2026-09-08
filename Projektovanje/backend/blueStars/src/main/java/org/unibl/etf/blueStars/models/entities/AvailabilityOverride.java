package org.unibl.etf.blueStars.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "availability_override", schema = "efikas")
public class AvailabilityOverride {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"AvailabilityOverrideId\"", nullable = false)
    private Long availabilityOverrideId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"WorkerId\"", nullable = false)
    private AppUser worker;

    @Column(name = "\"StartsAt\"", nullable = false, updatable = false)
    private Instant startsAt;

    @Column(name = "\"EndsAt\"")
    private Instant endsAt;

    @Column(name = "\"Reason\"", nullable = false, length = 300, updatable = false)
    private String reason;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"CreatedBy\"", nullable = false, updatable = false)
    private AppUser createdBy;

    @Column(name = "\"CreatedAt\"", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "\"ClearedAt\"")
    private Instant clearedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"ClearedBy\"")
    private AppUser clearedBy;
}
