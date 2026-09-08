package org.unibl.etf.blueStars.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(name = "expense_type", schema = "efikas")
public class ExpenseType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"ExpenseTypeId\"")
    private Integer expenseTypeId;

    @Column(name = "\"Name\"", nullable = false, unique = true)
    private String name;
}
