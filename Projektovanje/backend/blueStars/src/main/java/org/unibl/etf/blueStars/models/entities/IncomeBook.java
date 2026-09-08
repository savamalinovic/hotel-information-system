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
@Table(name = "income_book", schema = "efikas")
public class IncomeBook {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"IncomeBookId\"", nullable = false)
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
    @Column(name = "\"ProductSaleRevenue\"", nullable = false, precision = 8, scale = 2)
    private BigDecimal productSaleRevenue;

    @ColumnDefault("0")
    @Column(name = "\"GoodsSaleRevenue\"", nullable = false, precision = 8, scale = 2)
    private BigDecimal goodsSaleRevenue;

    @ColumnDefault("0")
    @Column(name = "\"ServiceSaleRevenue\"", nullable = false, precision = 8, scale = 2)
    private BigDecimal serviceSaleRevenue;

    @ColumnDefault("0")
    @Column(name = "\"OtherRevenue\"", nullable = false, precision = 8, scale = 2)
    private BigDecimal otherRevenue;

    @ColumnDefault("0")
    @Column(name = "\"FinancialRevenue\"", nullable = false, precision = 8, scale = 2)
    private BigDecimal financialRevenue;

    @ColumnDefault("0")
    @Column(name = "\"TotalRevenue\"", nullable = false, precision = 9, scale = 2)
    private BigDecimal totalRevenue;

    @ColumnDefault("0")
    @Column(name = "\"VATAmmount\"", nullable = false, precision = 8, scale = 2)
    private BigDecimal vatAmount;

    @ColumnDefault("now()")
    @CreationTimestamp
    @Column(name = "\"CreatedAt\"", nullable = false, updatable = false)
    private Instant createdAt;

}