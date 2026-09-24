package org.unibl.etf.blueStars.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "reservation_type", schema = "efikas")
public class ReservationType {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"TypeId\"", nullable = false)
    private Integer reservationTypeId;

    @Column(name = "\"TypeName\"", nullable = false, length = 50)
    private String typeName;

}