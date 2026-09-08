package org.unibl.etf.blueStars.models.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "demo_receipt", schema = "efikas")
public class DemoReceipt {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"DemoReceiptId\"", nullable = false)
    private Long demoReceiptId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"ReservationId\"", nullable = false)
    private Reservation reservation;

    @Column(name = "\"ReceiptNumber\"", nullable = false, length = 64)
    private String receiptNumber;

    @Column(name = "\"IssuedAt\"", nullable = false, updatable = false)
    private Instant issuedAt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"IssuedBy\"", nullable = false)
    private AppUser issuedBy;

    @Column(name = "\"HotelName\"", nullable = false, length = 150)
    private String hotelName;

    @Column(name = "\"HotelAddress\"", length = 250)
    private String hotelAddress;

    @Column(name = "\"HotelTaxId\"", length = 32)
    private String hotelTaxId;

    @Column(name = "\"ApartmentName\"", nullable = false, length = 100)
    private String apartmentName;

    @Column(name = "\"PrimaryGuestName\"", nullable = false, length = 120)
    private String primaryGuestName;

    @Column(name = "\"CheckInDate\"", nullable = false)
    private LocalDate checkInDate;

    @Column(name = "\"CheckOutDate\"", nullable = false)
    private LocalDate checkOutDate;

    @Column(name = "\"Nights\"", nullable = false)
    private Integer nights;

    @Column(name = "\"NightlyRate\"", nullable = false, precision = 12, scale = 2)
    private BigDecimal nightlyRate;

    @Column(name = "\"TotalAmount\"", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "\"VatAmount\"", nullable = false, precision = 12, scale = 2)
    private BigDecimal vatAmount;

    @Column(name = "\"Currency\"", nullable = false, length = 3)
    private String currency;

    @JdbcTypeCode(SqlTypes.VARBINARY)
    @Column(name = "\"PdfContent\"", nullable = false, columnDefinition = "bytea")
    private byte[] pdfContent;

    @Column(name = "\"PdfSha256\"", nullable = false, length = 64)
    private String pdfSha256;
}
