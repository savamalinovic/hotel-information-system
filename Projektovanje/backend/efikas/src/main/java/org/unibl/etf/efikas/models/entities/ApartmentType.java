package org.unibl.etf.efikas.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "apartment_type", schema = "efikas")
public class ApartmentType {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"ApartmentTypeId\"", nullable = false)
    private Integer apartmentTypeId;

    @Column(name = "\"Name\"", nullable = false, length = 80)
    private String name;

    @Column(name = "\"Description\"", length = 500)
    private String description;

    @Column(name = "\"Capacity\"", nullable = false)
    private Integer capacity;

    @Column(name = "\"DefaultNightlyRate\"", nullable = false, precision = 12, scale = 2)
    private BigDecimal defaultNightlyRate;

    @Column(name = "\"Active\"", nullable = false)
    private boolean active = true;

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
