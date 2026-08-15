package org.unibl.etf.efikas.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "operational_expense", schema = "efikas")
public class OperationalExpense {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"OperationalExpenseId\"", nullable = false)
    private Long operationalExpenseId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"ExpenseCategoryId\"", nullable = false, updatable = false)
    private ExpenseCategory category;

    @Column(name = "\"Name\"", nullable = false, length = 120, updatable = false)
    private String name;

    @Column(name = "\"Description\"", length = 1000, updatable = false)
    private String description;

    @Column(name = "\"Amount\"", nullable = false, precision = 14, scale = 2, updatable = false)
    private BigDecimal amount;

    @Column(name = "\"ExpenseDate\"", nullable = false, updatable = false)
    private LocalDate expenseDate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"CreatedBy\"", nullable = false, updatable = false)
    private AppUser createdBy;

    @Column(name = "\"CreatedAt\"", nullable = false, updatable = false)
    private Instant createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"VoidedBy\"")
    private AppUser voidedBy;

    @Column(name = "\"VoidedAt\"")
    private Instant voidedAt;

    @Column(name = "\"VoidReason\"", length = 300)
    private String voidReason;
}
