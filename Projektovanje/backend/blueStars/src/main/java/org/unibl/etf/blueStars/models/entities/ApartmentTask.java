package org.unibl.etf.blueStars.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "apartment_task", schema = "efikas")
public class ApartmentTask {
    @EmbeddedId
    private ApartmentTaskId id;

    @MapsId("apartmentId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "\"ApartmentId\"", nullable = false)
    private Apartment apartment;

    @Column(name = "\"DateTime\"", nullable = false)
    private Instant dateTime;

    @Column(name = "\"Note\"", length = 256)
    private String note;

    @Column(name = "\"Status\"", nullable = false)
    private Boolean status = false;

}