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
public class ApartmentExpenseId implements Serializable {
    private static final long serialVersionUID = 5635580517241181054L;
    @Column(name = "\"ApartmentId\"", nullable = false)
    private Integer apartmentId;

    @Column(name = "\"Name\"", nullable = false, length = 100)
    private String name;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || Hibernate.getClass(this) != Hibernate.getClass(o)) return false;
        ApartmentExpenseId entity = (ApartmentExpenseId) o;
        return Objects.equals(this.name, entity.name) &&
                Objects.equals(this.apartmentId, entity.apartmentId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name, apartmentId);
    }

}