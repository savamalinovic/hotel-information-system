package org.unibl.etf.blueStars.models.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "income_book_entry", schema = "efikas")
public class IncomeBookEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"IncomeBookEntryId\"", nullable = false)
    private Long incomeBookEntryId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"ReservationId\"", nullable = false)
    private Reservation reservation;

    @Column(name = "\"ReceiptNumber\"", nullable = false, length = 64)
    private String receiptNumber;

    @Column(name = "\"AccountingDate\"", nullable = false)
    private LocalDate accountingDate;

    @Column(name = "\"Description\"", nullable = false, length = 160)
    private String description;

    @Column(name = "\"ServiceSaleRevenue\"", nullable = false, precision = 12, scale = 2)
    private BigDecimal serviceSaleRevenue;

    @Column(name = "\"TotalRevenue\"", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalRevenue;

    @Column(name = "\"VatAmount\"", nullable = false, precision = 12, scale = 2)
    private BigDecimal vatAmount;

    @CreationTimestamp
    @Column(name = "\"CreatedAt\"", nullable = false, updatable = false)
    private Instant createdAt;
}
