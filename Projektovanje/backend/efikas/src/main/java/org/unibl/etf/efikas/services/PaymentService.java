package org.unibl.etf.efikas.services;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.unibl.etf.efikas.exceptions.DomainConflictException;
import org.unibl.etf.efikas.models.entities.AppUser;
import org.unibl.etf.efikas.models.entities.Payment;
import org.unibl.etf.efikas.models.entities.Reservation;
import org.unibl.etf.efikas.models.enums.PaymentStatus;
import org.unibl.etf.efikas.models.enums.PaymentType;
import org.unibl.etf.efikas.models.enums.ReservationStatus;
import org.unibl.etf.efikas.models.requests.CorrectPaymentRequest;
import org.unibl.etf.efikas.models.requests.RecordPaymentRequest;
import org.unibl.etf.efikas.models.requests.ReversePaymentRequest;
import org.unibl.etf.efikas.models.responses.PaymentResponse;
import org.unibl.etf.efikas.models.responses.PaymentSummaryResponse;
import org.unibl.etf.efikas.repositories.AppUserRepository;
import org.unibl.etf.efikas.repositories.PaymentRepository;
import org.unibl.etf.efikas.repositories.ReservationRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PaymentService {
    private static final BigDecimal ZERO = new BigDecimal("0.00");

    private final PaymentRepository paymentRepository;
    private final ReservationRepository reservationRepository;
    private final AppUserRepository appUserRepository;

    @Transactional(readOnly = true)
    public List<PaymentResponse> findAll(Integer reservationId) {
        requireReservation(reservationId);
        return paymentRepository.findByReservationReservationIdOrderByRecordedAtDescPaymentIdDesc(reservationId)
                .stream().map(PaymentService::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public PaymentSummaryResponse summary(Integer reservationId) {
        Reservation reservation = requireReservation(reservationId);
        return toSummary(reservation, netPaid(reservationId));
    }

    @Transactional
    public PaymentResponse record(Integer reservationId, RecordPaymentRequest request, String actorEmail) {
        Reservation reservation = lockReservation(reservationId);
        if (reservation.getStatus() == ReservationStatus.CANCELLED
                || reservation.getStatus() == ReservationStatus.NO_SHOW) {
            throw new DomainConflictException("A new payment cannot be recorded for a cancelled or no-show reservation.");
        }

        BigDecimal amount = money(request.amount());
        ensureNetWithinObligation(reservation, netPaid(reservationId).add(amount));

        Payment payment = new Payment();
        payment.setReservation(reservation);
        payment.setType(PaymentType.PAYMENT);
        payment.setAmount(amount);
        payment.setReference(normalizeNullable(request.reference()));
        payment.setReason(normalizeNullable(request.note()) == null
                ? "Payment recorded."
                : normalizeNullable(request.note()));
        payment.setRecordedBy(requireActor(actorEmail));
        return toResponse(paymentRepository.saveAndFlush(payment));
    }

    @Transactional
    public PaymentResponse correct(
            Integer reservationId, Long paymentId, CorrectPaymentRequest request, String actorEmail
    ) {
        Reservation reservation = lockReservation(reservationId);
        Payment original = requireOriginalPayment(reservationId, paymentId);
        ensureNotReversed(original);

        BigDecimal correction = money(request.amount());
        if (correction.signum() == 0) {
            throw new IllegalArgumentException("Correction amount must not be zero.");
        }
        BigDecimal effectiveOriginal = original.getAmount().add(correctionTotal(paymentId));
        if (effectiveOriginal.add(correction).signum() < 0) {
            throw new DomainConflictException("A correction cannot reduce a payment below zero.");
        }
        ensureNetWithinObligation(reservation, netPaid(reservationId).add(correction));

        Payment payment = referencedEntry(
                reservation, original, PaymentType.CORRECTION, correction, request.reason(), actorEmail);
        return toResponse(paymentRepository.saveAndFlush(payment));
    }

    @Transactional
    public PaymentResponse reverse(
            Integer reservationId, Long paymentId, ReversePaymentRequest request, String actorEmail
    ) {
        Reservation reservation = lockReservation(reservationId);
        Payment original = requireOriginalPayment(reservationId, paymentId);
        ensureNotReversed(original);

        BigDecimal remainingEffect = original.getAmount().add(correctionTotal(paymentId));
        if (remainingEffect.signum() <= 0) {
            throw new DomainConflictException("The payment has no remaining amount to reverse.");
        }
        BigDecimal reversal = remainingEffect.negate();
        ensureNetWithinObligation(reservation, netPaid(reservationId).add(reversal));

        Payment payment = referencedEntry(
                reservation, original, PaymentType.REVERSAL, reversal, request.reason(), actorEmail);
        return toResponse(paymentRepository.saveAndFlush(payment));
    }

    private Payment referencedEntry(
            Reservation reservation,
            Payment original,
            PaymentType type,
            BigDecimal amount,
            String reason,
            String actorEmail
    ) {
        Payment payment = new Payment();
        payment.setReservation(reservation);
        payment.setType(type);
        payment.setAmount(amount);
        payment.setReferencedPayment(original);
        payment.setReason(reason.trim());
        payment.setRecordedBy(requireActor(actorEmail));
        return payment;
    }

    private Payment requireOriginalPayment(Integer reservationId, Long paymentId) {
        Payment payment = paymentRepository.findByPaymentIdAndReservationReservationId(paymentId, reservationId)
                .orElseThrow(() -> new EntityNotFoundException("Payment not found for the reservation."));
        if (payment.getType() != PaymentType.PAYMENT) {
            throw new DomainConflictException("Corrections and reversals must reference an original payment.");
        }
        return payment;
    }

    private void ensureNotReversed(Payment original) {
        if (paymentRepository.existsByReferencedPaymentPaymentIdAndType(
                original.getPaymentId(), PaymentType.REVERSAL)) {
            throw new DomainConflictException("The payment has already been reversed.");
        }
    }

    private void ensureNetWithinObligation(Reservation reservation, BigDecimal proposedNet) {
        if (proposedNet.signum() < 0) {
            throw new DomainConflictException("Net payments cannot be negative.");
        }
        if (proposedNet.compareTo(totalDue(reservation)) > 0) {
            throw new DomainConflictException("Net payments cannot exceed the reservation total.");
        }
    }

    private Reservation requireReservation(Integer reservationId) {
        return reservationRepository.findById(reservationId)
                .orElseThrow(() -> new EntityNotFoundException("Reservation not found."));
    }

    private Reservation lockReservation(Integer reservationId) {
        return reservationRepository.findByIdForUpdate(reservationId)
                .orElseThrow(() -> new EntityNotFoundException("Reservation not found."));
    }

    private AppUser requireActor(String email) {
        return appUserRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new EntityNotFoundException("Authenticated user not found."));
    }

    private BigDecimal netPaid(Integer reservationId) {
        return money(paymentRepository.netPaid(reservationId));
    }

    private BigDecimal correctionTotal(Long paymentId) {
        return money(paymentRepository.correctionTotal(paymentId));
    }

    static PaymentStatus deriveStatus(BigDecimal netPaid, BigDecimal totalDue) {
        if (netPaid.signum() <= 0) {
            return PaymentStatus.UNPAID;
        }
        return netPaid.compareTo(totalDue) < 0 ? PaymentStatus.PARTIALLY_PAID : PaymentStatus.PAID;
    }

    static BigDecimal totalDue(Reservation reservation) {
        long nights = ChronoUnit.DAYS.between(reservation.getCheckInDate(), reservation.getCheckOutDate());
        return money(reservation.getNightlyRate().multiply(BigDecimal.valueOf(nights)));
    }

    private static PaymentSummaryResponse toSummary(Reservation reservation, BigDecimal netPaid) {
        BigDecimal totalDue = totalDue(reservation);
        return new PaymentSummaryResponse(
                reservation.getReservationId(), totalDue, netPaid, totalDue.subtract(netPaid),
                deriveStatus(netPaid, totalDue));
    }

    private static PaymentResponse toResponse(Payment payment) {
        return new PaymentResponse(
                payment.getPaymentId(), payment.getReservation().getReservationId(), payment.getType(),
                payment.getAmount(), payment.getReferencedPayment() == null
                        ? null : payment.getReferencedPayment().getPaymentId(),
                payment.getReference(), payment.getReason(), payment.getRecordedBy().getUserId(),
                payment.getRecordedAt());
    }

    private static BigDecimal money(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.UNNECESSARY);
    }

    private static String normalizeNullable(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
