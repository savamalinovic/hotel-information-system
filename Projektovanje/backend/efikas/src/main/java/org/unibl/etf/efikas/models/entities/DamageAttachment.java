package org.unibl.etf.efikas.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "damage_attachment", schema = "efikas")
public class DamageAttachment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"DamageAttachmentId\"", nullable = false)
    private Long damageAttachmentId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"DamageId\"", nullable = false, updatable = false)
    private Damage damage;

    @Column(name = "\"StorageKey\"", nullable = false, length = 512, updatable = false)
    private String storageKey;

    @Column(name = "\"OriginalName\"", nullable = false, length = 255, updatable = false)
    private String originalName;

    @Column(name = "\"ContentType\"", length = 150, updatable = false)
    private String contentType;

    @Column(name = "\"SizeBytes\"", nullable = false, updatable = false)
    private Long sizeBytes;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"UploadedBy\"", nullable = false, updatable = false)
    private AppUser uploadedBy;

    @Column(name = "\"UploadedAt\"", nullable = false, updatable = false)
    private Instant uploadedAt;
}
