package org.unibl.etf.blueStars.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Getter
@Setter
@Entity
@Table(name = "apartment_damage", schema = "efikas")
public class ApartmentDamage {
    @EmbeddedId
    private ApartmentDamageId id;

    @MapsId("apartmentId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "\"ApartmentId\"", nullable = false)
    private Apartment apartment;

    @Column(name = "\"DamagePrice\"")
    private Double damagePrice;

    @Column(name = "\"Note\"", nullable = false, length = 256)
    private String note;

    @Column(name = "\"Status\"", nullable = false)
    private Boolean status = false;

}