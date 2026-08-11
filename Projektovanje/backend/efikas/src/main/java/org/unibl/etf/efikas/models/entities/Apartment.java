package org.unibl.etf.efikas.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.unibl.etf.efikas.models.enums.ApartmentOperationalStatus;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Getter
@Setter
@Entity
@Table(name = "apartment", schema = "efikas")
public class Apartment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"ApartmentId\"", nullable = false)
    private Integer apartmentId;

    @Column(name = "\"Name\"", nullable = false, length = 50)
    private String name;

    @Column(name = "\"Address\"", nullable = false, length = 100)
    private String address;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"ApartmentTypeId\"", nullable = false)
    private ApartmentType type;

    @Column(name = "\"Floor\"")
    private Integer floor;

    @Enumerated(EnumType.STRING)
    @Column(name = "\"OperationalStatus\"", nullable = false, length = 32)
    private ApartmentOperationalStatus operationalStatus = ApartmentOperationalStatus.READY;

    @Column(name = "\"Active\"", nullable = false)
    private boolean active = true;

    @Version
    @Column(name = "\"Version\"", nullable = false)
    private Long version;

    @Column(name = "\"CreatedAt\"", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "\"UpdatedAt\"", nullable = false)
    private Instant updatedAt;

    @ElementCollection
    @CollectionTable(
            name = "\"apartment_trait\"",
            schema = "efikas",
            joinColumns = @JoinColumn(name = "\"ApartmentId\"")
    )
    @MapKeyColumn(name = "\"TraitName\"")
    @Column(name = "\"TraitValue\"")
    private Map<String, Boolean> traits = new HashMap<>();

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
