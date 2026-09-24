package org.unibl.etf.blueStars.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.unibl.etf.blueStars.models.entities.Payment;
import org.unibl.etf.blueStars.models.enums.PaymentType;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByReservationReservationIdOrderByRecordedAtDescPaymentIdDesc(Integer reservationId);

    Optional<Payment> findByPaymentIdAndReservationReservationId(Long paymentId, Integer reservationId);

    boolean existsByReferencedPaymentPaymentIdAndType(Long referencedPaymentId, PaymentType type);

    @Query("""
            select coalesce(sum(payment.amount), 0) from Payment payment
            where payment.reservation.reservationId = :reservationId
            """)
    BigDecimal netPaid(Integer reservationId);

    @Query("""
            select coalesce(sum(payment.amount), 0) from Payment payment
            where payment.referencedPayment.paymentId = :paymentId
              and payment.type = org.unibl.etf.blueStars.models.enums.PaymentType.CORRECTION
            """)
    BigDecimal correctionTotal(Long paymentId);
}
