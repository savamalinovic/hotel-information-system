package org.unibl.etf.efikas.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.unibl.etf.efikas.models.enums.PaymentType;

import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "payment", schema = "efikas")
public class Payment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"PaymentId\"", nullable = false)
    private Long paymentId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"ReservationId\"", nullable = false)
    private Reservation reservation;

    @Enumerated(EnumType.STRING)
    @Column(name = "\"Type\"", nullable = false, length = 24)
    private PaymentType type;

    @Column(name = "\"Amount\"", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"ReferencedPaymentId\"")
    private Payment referencedPayment;

    @Column(name = "\"Reference\"", length = 100)
    private String reference;

    @Column(name = "\"Reason\"", nullable = false, length = 300)
    private String reason;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"RecordedBy\"", nullable = false)
    private AppUser recordedBy;

    @CreationTimestamp
    @Column(name = "\"RecordedAt\"", nullable = false, updatable = false)
    private Instant recordedAt;
}
