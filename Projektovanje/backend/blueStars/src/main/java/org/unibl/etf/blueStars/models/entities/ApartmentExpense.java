package org.unibl.etf.blueStars.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Getter
@Setter
@Entity
@Table(name = "apartment_expense", schema = "efikas")
public class ApartmentExpense {
    @EmbeddedId
    @AttributeOverrides({
            @AttributeOverride(name = "apartmentId", column = @Column(name = "\"ApartmentId\"")),
            @AttributeOverride(name = "name", column = @Column(name = "\"Name\""))
    })
    private ApartmentExpenseId id;

    @MapsId("apartmentId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "\"ApartmentId\"", nullable = false)
    private Apartment apartment;

    @Column(name = "\"Amount\"", nullable = false)
    private Double amount;

    @Column(name = "\"Note\"", nullable = false, length = 256)
    private String note;

    @Column(name = "\"Status\"", nullable = false)
    private Boolean status = false;

    @ManyToOne
    @JoinColumn(name = "\"ExpenseTypeId\"", nullable = false)
    private ExpenseType expenseType;
    
}