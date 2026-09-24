package org.unibl.etf.blueStars.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "expenses_book", schema = "efikas")
public class ExpensesBook {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"ExpensesBookId\"", nullable = false)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "\"ApartmentId\"", nullable = false)
    private Apartment apartment;

    @Column(name = "\"AccountingDate\"", nullable = false)
    private LocalDate accountingDate;

    @Column(name = "\"Description\"", nullable = false, length = 100)
    private String description;

    @ColumnDefault("0")
    @Column(name = "\"GoodsPurchaseValue\"", nullable = false, precision = 8, scale = 2)
    private BigDecimal goodsPurchaseValue;

    @ColumnDefault("0")
    @Column(name = "\"Materials\"", nullable = false, precision = 8, scale = 2)
    private BigDecimal materials;

    @ColumnDefault("0")
    @Column(name = "\"PersonalIncome\"", nullable = false, precision = 8, scale = 2)
    private BigDecimal personalIncome;

    @ColumnDefault("0")
    @Column(name = "\"ProductServices\"", nullable = false, precision = 8, scale = 2)
    private BigDecimal productServices;

    @ColumnDefault("0")
    @Column(name = "\"OtherExpenses\"", nullable = false, precision = 8, scale = 2)
    private BigDecimal otherExpenses;

    @ColumnDefault("0")
    @Column(name = "\"FinancialExpenses\"", nullable = false, precision = 8, scale = 2)
    private BigDecimal financialExpenses;

    @ColumnDefault("0")
    @Column(name = "\"Amortization\"", nullable = false, precision = 8, scale = 2)
    private BigDecimal amortization;

    @ColumnDefault("0")
    @Column(name = "\"SupplyShortage\"", nullable = false, precision = 8, scale = 2)
    private BigDecimal supplyShortage;

    @ColumnDefault("0")
    @Column(name = "\"InputVAT\"", nullable = false, precision = 8, scale = 2)
    private BigDecimal inputVAT;

    @ColumnDefault("0")
    @Column(name = "\"TotalRecognizedExpenses\"", nullable = false, precision = 9, scale = 2)
    private BigDecimal totalRecognizedExpenses;

    @ColumnDefault("0")
    @Column(name = "\"TotalUnrecognizedExpenses\"", nullable = false, precision = 9, scale = 2)
    private BigDecimal totalUnrecognizedExpenses;

    @ColumnDefault("now()")
    @CreationTimestamp
    @Column(name = "\"CreatedAt\"", nullable = false, updatable = false)
    private Instant createdAt;

}