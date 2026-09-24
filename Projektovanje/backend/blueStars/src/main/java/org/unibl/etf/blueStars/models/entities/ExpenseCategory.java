package org.unibl.etf.blueStars.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "expense_category", schema = "efikas")
public class ExpenseCategory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"ExpenseCategoryId\"", nullable = false)
    private Integer expenseCategoryId;

    @Column(name = "\"Name\"", nullable = false, length = 80)
    private String name;

    @Column(name = "\"Description\"", length = 300)
    private String description;

    @Column(name = "\"Active\"", nullable = false)
    private boolean active;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"CreatedBy\"", nullable = false, updatable = false)
    private AppUser createdBy;

    @Column(name = "\"CreatedAt\"", nullable = false, updatable = false)
    private Instant createdAt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"UpdatedBy\"", nullable = false)
    private AppUser updatedBy;

    @Column(name = "\"UpdatedAt\"", nullable = false)
    private Instant updatedAt;
}
