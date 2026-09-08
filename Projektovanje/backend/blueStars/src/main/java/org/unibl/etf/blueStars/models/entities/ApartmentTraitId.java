package org.unibl.etf.blueStars.models.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.Hibernate;

import java.io.Serializable;
import java.util.Objects;

@Getter
@Setter
@Embeddable
public class ApartmentTraitId implements Serializable {
    private static final long serialVersionUID = 2500302570469407628L;
    @Column(name = "\"ApartmentId\"", nullable = false)
    private Integer apartmentId;

    @Column(name = "\"TraitName\"", nullable = false, length = 15)
    private String traitName;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || Hibernate.getClass(this) != Hibernate.getClass(o)) return false;
        ApartmentTraitId entity = (ApartmentTraitId) o;
        return Objects.equals(this.traitName, entity.traitName) &&
                Objects.equals(this.apartmentId, entity.apartmentId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(traitName, apartmentId);
    }

}