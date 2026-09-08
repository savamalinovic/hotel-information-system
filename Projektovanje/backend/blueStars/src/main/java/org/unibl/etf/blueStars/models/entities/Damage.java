package org.unibl.etf.blueStars.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "damage_record", schema = "efikas")
public class Damage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"DamageId\"", nullable = false)
    private Long damageId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"ApartmentId\"", nullable = false, updatable = false)
    private Apartment apartment;

    @Column(name = "\"Title\"", nullable = false, length = 120)
    private String title;

    @Column(name = "\"Description\"", nullable = false, length = 2000)
    private String description;

    @Column(name = "\"EstimatedAmount\"", precision = 14, scale = 2)
    private BigDecimal estimatedAmount;

    @Column(name = "\"ConfirmedAmount\"", precision = 14, scale = 2)
    private BigDecimal confirmedAmount;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"CreatedBy\"", nullable = false, updatable = false)
    private AppUser createdBy;

    @Column(name = "\"CreatedAt\"", nullable = false, updatable = false)
    private Instant createdAt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"UpdatedBy\"", nullable = false)
    private AppUser updatedBy;

    @Column(name = "\"UpdatedAt\"", nullable = false)
    private Instant updatedAt;
}
