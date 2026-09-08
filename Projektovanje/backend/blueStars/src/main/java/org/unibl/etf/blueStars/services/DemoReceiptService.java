package org.unibl.etf.blueStars.services;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.unibl.etf.blueStars.exceptions.DomainConflictException;
import org.unibl.etf.blueStars.models.entities.AppUser;
import org.unibl.etf.blueStars.models.entities.DemoReceipt;
import org.unibl.etf.blueStars.models.entities.HotelProfile;
import org.unibl.etf.blueStars.models.entities.Reservation;
import org.unibl.etf.blueStars.models.enums.PaymentStatus;
import org.unibl.etf.blueStars.models.enums.ReservationStatus;
import org.unibl.etf.blueStars.models.enums.UserRole;
import org.unibl.etf.blueStars.models.enums.AuditEvent;
import org.unibl.etf.blueStars.models.responses.DemoReceiptResponse;
import org.unibl.etf.blueStars.repositories.AppUserRepository;
import org.unibl.etf.blueStars.repositories.DemoReceiptRepository;
import org.unibl.etf.blueStars.repositories.HotelProfileRepository;
import org.unibl.etf.blueStars.repositories.PaymentRepository;
import org.unibl.etf.blueStars.repositories.ReservationGuestRepository;
import org.unibl.etf.blueStars.repositories.ReservationRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
public class DemoReceiptService {
    private static final ZoneId HOTEL_ZONE = ZoneId.of("Europe/Sarajevo");
    private static final BigDecimal ZERO = new BigDecimal("0.00");

    private final DemoReceiptRepository demoReceiptRepository;
    private final ReservationRepository reservationRepository;
    private final ReservationGuestRepository reservationGuestRepository;
    private final PaymentRepository paymentRepository;
    private final AppUserRepository appUserRepository;
    private final HotelProfileRepository hotelProfileRepository;
    private final BusinessBooksService businessBooksService;
    private final DemoReceiptPdfService pdfService;
    private final AuditLogService auditLogService;

    @Transactional
    public GenerationResult generate(Integer reservationId, String actorEmail) {
        Reservation reservation = reservationRepository.findByIdForUpdate(reservationId)
                .orElseThrow(() -> new EntityNotFoundException("Reservation not found."));
        AppUser actor = requireActiveAgent(actorEmail);
        DemoReceipt existing = demoReceiptRepository.findByReservationReservationId(reservationId).orElse(null);
        if (existing != null) {
            return new GenerationResult(toResponse(existing), false);
        }
        if (reservation.getStatus() != ReservationStatus.CHECKED_OUT) {
            throw new DomainConflictException("A demo receipt requires a checked-out reservation.");
        }

        BigDecimal totalDue = PaymentService.totalDue(reservation);
        BigDecimal netPaid = money(paymentRepository.netPaid(reservationId));
        if (PaymentService.deriveStatus(netPaid, totalDue) != PaymentStatus.PAID) {
            throw new DomainConflictException("A demo receipt requires a fully paid reservation.");
        }

        HotelProfile hotel = hotelProfileRepository.findById(HotelProfile.SINGLETON_ID)
                .orElseThrow(() -> new EntityNotFoundException("Hotel profile not found."));
        String primaryGuestName = reservationGuestRepository
                .findByReservationReservationIdAndPrimaryGuestTrue(reservationId)
                .map(link -> link.getGuest().getName() + " " + link.getGuest().getSurname())
                .orElseThrow(() -> new DomainConflictException("The reservation has no primary guest."));

        DemoReceipt receipt = new DemoReceipt();
        receipt.setReservation(reservation);
        receipt.setIssuedAt(Instant.now());
        receipt.setReceiptNumber(receiptNumber(
                demoReceiptRepository.nextReceiptSequence(), receipt.getIssuedAt()));
        receipt.setIssuedBy(actor);
        receipt.setHotelName(hotel.getLegalName() == null ? hotel.getName() : hotel.getLegalName());
        receipt.setHotelAddress(hotelAddress(hotel));
        receipt.setHotelTaxId(hotel.getTaxId());
        receipt.setApartmentName(reservation.getApartment().getName());
        receipt.setPrimaryGuestName(primaryGuestName);
        receipt.setCheckInDate(reservation.getCheckInDate());
        receipt.setCheckOutDate(reservation.getCheckOutDate());
        receipt.setNights(Math.toIntExact(ChronoUnit.DAYS.between(
                reservation.getCheckInDate(), reservation.getCheckOutDate())));
        receipt.setNightlyRate(money(reservation.getNightlyRate()));
        receipt.setTotalAmount(totalDue);
        receipt.setVatAmount(ZERO);
        receipt.setCurrency("BAM");
        byte[] pdf = pdfService.generate(receipt);
        receipt.setPdfContent(pdf);
        receipt.setPdfSha256(sha256(pdf));
        demoReceiptRepository.saveAndFlush(receipt);

        businessBooksService.recordGeneratedReceipt(
                reservationId, receipt.getReceiptNumber(), receipt.getIssuedAt().atZone(HOTEL_ZONE).toLocalDate(),
                "Demo račun " + receipt.getReceiptNumber() + " – usluga smještaja",
                totalDue, totalDue, ZERO);
        auditLogService.record(AuditEvent.DEMO_RECEIPT_GENERATED, actor, reservation, reservation.getApartment(), null,
                "Demo receipt " + receipt.getReceiptNumber() + " generated.");
        return new GenerationResult(toResponse(receipt), true);
    }

    @Transactional(readOnly = true)
    public DemoReceiptResponse find(Integer reservationId) {
        return toResponse(requireReceipt(reservationId));
    }

    @Transactional(readOnly = true)
    public PdfDownload pdf(Integer reservationId) {
        DemoReceipt receipt = requireReceipt(reservationId);
        return new PdfDownload(receipt.getReceiptNumber() + ".pdf", receipt.getPdfContent().clone());
    }

    private DemoReceipt requireReceipt(Integer reservationId) {
        return demoReceiptRepository.findByReservationReservationId(reservationId)
                .orElseThrow(() -> new EntityNotFoundException("Demo receipt not found."));
    }

    private AppUser requireActiveAgent(String email) {
        AppUser actor = appUserRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new EntityNotFoundException("Authenticated user not found."));
        if (!actor.isActive() || actor.getRole() != UserRole.AGENT) {
            throw new DomainConflictException("Only an active agent can generate a demo receipt.");
        }
        return actor;
    }

    private static DemoReceiptResponse toResponse(DemoReceipt receipt) {
        Integer reservationId = receipt.getReservation().getReservationId();
        return new DemoReceiptResponse(receipt.getDemoReceiptId(), reservationId, receipt.getReceiptNumber(),
                receipt.getIssuedAt(), receipt.getIssuedBy().getUserId(), receipt.getHotelName(),
                receipt.getHotelAddress(), receipt.getHotelTaxId(), receipt.getApartmentName(),
                receipt.getPrimaryGuestName(), receipt.getCheckInDate(), receipt.getCheckOutDate(),
                receipt.getNights(), receipt.getNightlyRate(), receipt.getTotalAmount(), receipt.getVatAmount(),
                receipt.getCurrency(), receipt.getPdfSha256(),
                "/api/v1/reservations/" + reservationId + "/demo-receipt/pdf");
    }

    private static String receiptNumber(Long sequence, Instant issuedAt) {
        return "DEMO-" + issuedAt.atZone(HOTEL_ZONE).getYear() + "-" + String.format("%06d", sequence);
    }

    private static String hotelAddress(HotelProfile hotel) {
        String address = hotel.getAddress();
        String city = hotel.getCity();
        if (address == null || address.isBlank()) {
            return city;
        }
        return city == null || city.isBlank() ? address : address + ", " + city;
    }

    private static BigDecimal money(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.UNNECESSARY);
    }

    private static String sha256(byte[] content) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable.", exception);
        }
    }

    public record GenerationResult(DemoReceiptResponse receipt, boolean created) {
    }

    public record PdfDownload(String filename, byte[] content) {
    }
}
