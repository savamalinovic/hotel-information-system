package org.unibl.etf.efikas.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "apartment_picture", schema = "efikas")
public class ApartmentPicture {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"PictureId\"", nullable = false)
    private Long pictureId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"ApartmentId\"", nullable = false)
    private Apartment apartment;

    @Column(name = "\"PictureURL\"", nullable = false, length = 512)
    private String storageKey;

    @Column(name = "\"DisplayOrder\"", nullable = false)
    private Integer displayOrder;

    @Column(name = "\"CreatedAt\"", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
