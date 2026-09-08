package org.unibl.etf.blueStars.services;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.unibl.etf.blueStars.models.entities.GuestBookEntry;
import org.unibl.etf.blueStars.models.entities.IncomeBookEntry;
import org.unibl.etf.blueStars.models.entities.Reservation;
import org.unibl.etf.blueStars.models.enums.GuestBookType;
import org.unibl.etf.blueStars.models.responses.GuestBookEntryResponse;
import org.unibl.etf.blueStars.models.responses.IncomeBookEntryResponse;
import org.unibl.etf.blueStars.models.responses.PageResponse;
import org.unibl.etf.blueStars.repositories.GuestBookEntryRepository;
import org.unibl.etf.blueStars.repositories.IncomeBookEntryRepository;
import org.unibl.etf.blueStars.repositories.ReservationRepository;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class BusinessBooksService {
    private static final ZoneId HOTEL_ZONE = ZoneId.of("Europe/Sarajevo");
    private static final LocalDate MIN_DATE = LocalDate.of(1, 1, 1);
    private static final LocalDate MAX_DATE = LocalDate.of(9999, 12, 31);
    private static final Instant MIN_INSTANT = MIN_DATE.atStartOfDay(HOTEL_ZONE).toInstant();
    private static final Instant MAX_EXCLUSIVE_INSTANT = LocalDate.of(10_000, 1, 1)
            .atStartOfDay(HOTEL_ZONE).toInstant();

    private final GuestBookEntryRepository guestBookEntryRepository;
    private final IncomeBookEntryRepository incomeBookEntryRepository;
    private final ReservationRepository reservationRepository;

    @Transactional(readOnly = true)
    public PageResponse<GuestBookEntryResponse> domesticGuests(
            LocalDate from, LocalDate to, String query, Pageable pageable
    ) {
        return guestEntries(GuestBookType.DOMESTIC, from, to, query, pageable);
    }

    @Transactional(readOnly = true)
    public PageResponse<GuestBookEntryResponse> foreignGuests(
            LocalDate from, LocalDate to, String query, Pageable pageable
    ) {
        return guestEntries(GuestBookType.FOREIGN, from, to, query, pageable);
    }

    @Transactional(readOnly = true)
    public PageResponse<IncomeBookEntryResponse> income(
            LocalDate from, LocalDate to, String query, Pageable pageable
    ) {
        validatePeriod(from, to);
        return PageResponse.from(incomeBookEntryRepository
                .search(from == null ? MIN_DATE : from, to == null ? MAX_DATE : to, searchTerm(query), pageable)
                .map(BusinessBooksService::toIncomeResponse));
    }

    @Transactional(readOnly = true)
    public byte[] exportDomesticGuests(LocalDate from, LocalDate to, String query) {
        return guestCsv(GuestBookType.DOMESTIC, from, to, query);
    }

    @Transactional(readOnly = true)
    public byte[] exportForeignGuests(LocalDate from, LocalDate to, String query) {
        return guestCsv(GuestBookType.FOREIGN, from, to, query);
    }

    @Transactional(readOnly = true)
    public byte[] exportIncome(LocalDate from, LocalDate to, String query) {
        validatePeriod(from, to);
        List<IncomeBookEntryResponse> entries = incomeBookEntryRepository
                .search(from == null ? MIN_DATE : from, to == null ? MAX_DATE : to, searchTerm(query), Pageable.unpaged(
                        Sort.by(Sort.Direction.ASC, "accountingDate", "incomeBookEntryId")))
                .map(BusinessBooksService::toIncomeResponse).getContent();
        StringBuilder csv = csvHeader("incomeBookEntryId", "reservationId", "receiptNumber",
                "accountingDate", "description", "serviceSaleRevenue", "totalRevenue", "vatAmount", "createdAt");
        entries.forEach(entry -> csvRow(csv, entry.incomeBookEntryId(), entry.reservationId(), entry.receiptNumber(),
                entry.accountingDate(), entry.description(), entry.serviceSaleRevenue(), entry.totalRevenue(),
                entry.vatAmount(), entry.createdAt()));
        return utf8Csv(csv);
    }

    /** Internal write boundary used by B07 after a valid demo receipt is generated. */
    @Transactional
    public IncomeBookEntryResponse recordGeneratedReceipt(
            Integer reservationId,
            String receiptNumber,
            LocalDate accountingDate,
            String description,
            BigDecimal serviceSaleRevenue,
            BigDecimal totalRevenue,
            BigDecimal vatAmount
    ) {
        Reservation reservation = reservationRepository.findByIdForUpdate(reservationId)
                .orElseThrow(() -> new EntityNotFoundException("Reservation not found."));
        String normalizedReceiptNumber = requireText(receiptNumber, "Receipt number is required.");
        LocalDate requiredAccountingDate = Objects.requireNonNull(accountingDate, "Accounting date is required.");
        String normalizedDescription = requireText(description, "Description is required.");
        BigDecimal requiredServiceRevenue = requireNonNegative(serviceSaleRevenue, "Service sale revenue");
        BigDecimal requiredTotalRevenue = requireNonNegative(totalRevenue, "Total revenue");
        BigDecimal requiredVatAmount = requireNonNegative(vatAmount, "VAT amount");
        IncomeBookEntry existing = incomeBookEntryRepository.findByReservationReservationId(reservationId)
                .orElse(null);
        if (existing != null) {
            if (!sameIncome(existing, normalizedReceiptNumber, requiredAccountingDate, normalizedDescription,
                    requiredServiceRevenue, requiredTotalRevenue, requiredVatAmount)) {
                throw new IllegalStateException("The reservation already has a different income-book entry.");
            }
            return toIncomeResponse(existing);
        }
        IncomeBookEntry entry = new IncomeBookEntry();
        entry.setReservation(reservation);
        entry.setReceiptNumber(normalizedReceiptNumber);
        entry.setAccountingDate(requiredAccountingDate);
        entry.setDescription(normalizedDescription);
        entry.setServiceSaleRevenue(requiredServiceRevenue);
        entry.setTotalRevenue(requiredTotalRevenue);
        entry.setVatAmount(requiredVatAmount);
        return toIncomeResponse(incomeBookEntryRepository.saveAndFlush(entry));
    }

    private static boolean sameIncome(
            IncomeBookEntry existing,
            String receiptNumber,
            LocalDate accountingDate,
            String description,
            BigDecimal serviceSaleRevenue,
            BigDecimal totalRevenue,
            BigDecimal vatAmount
    ) {
        return existing.getReceiptNumber().equals(receiptNumber)
                && existing.getAccountingDate().equals(accountingDate)
                && existing.getDescription().equals(description)
                && existing.getServiceSaleRevenue().compareTo(serviceSaleRevenue) == 0
                && existing.getTotalRevenue().compareTo(totalRevenue) == 0
                && existing.getVatAmount().compareTo(vatAmount) == 0;
    }

    private PageResponse<GuestBookEntryResponse> guestEntries(
            GuestBookType type, LocalDate from, LocalDate to, String query, Pageable pageable
    ) {
        validatePeriod(from, to);
        return PageResponse.from(guestBookEntryRepository.search(type, fromInstant(from), toExclusiveInstant(to),
                searchTerm(query), pageable).map(BusinessBooksService::toGuestResponse));
    }

    private byte[] guestCsv(GuestBookType type, LocalDate from, LocalDate to, String query) {
        validatePeriod(from, to);
        List<GuestBookEntryResponse> entries = guestBookEntryRepository
                .search(type, fromInstant(from), toExclusiveInstant(to), searchTerm(query), Pageable.unpaged(
                        Sort.by(Sort.Direction.ASC, "arrivedAt", "guestBookEntryId")))
                .map(BusinessBooksService::toGuestResponse).getContent();
        StringBuilder csv = csvHeader("guestBookEntryId", "reservationId", "guestId", "bookType", "citizenId",
                "personalDocumentUrl", "name", "surname", "gender", "phoneNumber", "birthDate", "birthPlace",
                "birthMunicipality", "birthCountry", "address", "citizenship", "passportNumber",
                "passportIssuedDate", "visaType", "visaNumber", "permittedResidenceDate", "entryDate", "entryPlace",
                "apartmentId", "apartmentName", "apartmentFloor", "arrivedAt", "plannedDepartureDate",
                "checkedInByUserId", "createdAt");
        entries.forEach(entry -> csvRow(csv, entry.guestBookEntryId(), entry.reservationId(), entry.guestId(),
                entry.bookType(), entry.citizenId(), entry.personalDocumentUrl(), entry.name(), entry.surname(),
                entry.gender(), entry.phoneNumber(), entry.birthDate(), entry.birthPlace(), entry.birthMunicipality(),
                entry.birthCountry(), entry.address(), entry.citizenship(), entry.passportNumber(),
                entry.passportIssuedDate(), entry.visaType(), entry.visaNumber(), entry.permittedResidenceDate(),
                entry.entryDate(), entry.entryPlace(), entry.apartmentId(), entry.apartmentName(), entry.apartmentFloor(),
                entry.arrivedAt(), entry.plannedDepartureDate(), entry.checkedInByUserId(), entry.createdAt()));
        return utf8Csv(csv);
    }

    private static GuestBookEntryResponse toGuestResponse(GuestBookEntry entry) {
        return new GuestBookEntryResponse(entry.getGuestBookEntryId(), entry.getReservation().getReservationId(),
                entry.getGuest().getGuestId(), entry.getBookType(), entry.getCitizenId(), entry.getPersonalDocumentUrl(),
                entry.getName(), entry.getSurname(), entry.getGender(), entry.getPhoneNumber(), entry.getBirthDate(),
                entry.getBirthPlace(), entry.getBirthMunicipality(), entry.getBirthCountry(), entry.getAddress(),
                entry.getCitizenship(), entry.getPassportNumber(), entry.getPassportIssuedDate(), entry.getVisaType(),
                entry.getVisaNumber(), entry.getPermittedResidenceDate(), entry.getEntryDate(), entry.getEntryPlace(),
                entry.getApartment().getApartmentId(), entry.getApartmentName(), entry.getApartmentFloor(),
                entry.getArrivedAt(), entry.getPlannedDepartureDate(), entry.getCheckedInBy().getUserId(),
                entry.getCreatedAt());
    }

    private static IncomeBookEntryResponse toIncomeResponse(IncomeBookEntry entry) {
        return new IncomeBookEntryResponse(entry.getIncomeBookEntryId(), entry.getReservation().getReservationId(),
                entry.getReceiptNumber(), entry.getAccountingDate(), entry.getDescription(),
                entry.getServiceSaleRevenue(), entry.getTotalRevenue(), entry.getVatAmount(), entry.getCreatedAt());
    }

    private static void validatePeriod(LocalDate from, LocalDate to) {
        if (from != null && to != null && from.isAfter(to)) {
            throw new IllegalArgumentException("'from' must be before or equal to 'to'.");
        }
    }

    private static Instant fromInstant(LocalDate from) {
        return from == null ? MIN_INSTANT : from.atStartOfDay(HOTEL_ZONE).toInstant();
    }

    private static Instant toExclusiveInstant(LocalDate to) {
        return to == null || to.equals(MAX_DATE)
                ? MAX_EXCLUSIVE_INSTANT
                : to.plusDays(1).atStartOfDay(HOTEL_ZONE).toInstant();
    }

    private static String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String searchTerm(String value) {
        String normalized = normalize(value);
        return normalized == null ? "" : normalized;
    }

    private static String requireText(String value, String message) {
        String normalized = normalize(value);
        if (normalized == null) {
            throw new IllegalArgumentException(message);
        }
        return normalized;
    }

    private static BigDecimal requireNonNegative(BigDecimal value, String field) {
        if (value == null || value.signum() < 0) {
            throw new IllegalArgumentException(field + " must be zero or positive.");
        }
        return value;
    }

    private static StringBuilder csvHeader(Object... values) {
        StringBuilder csv = new StringBuilder();
        csvRow(csv, values);
        return csv;
    }

    private static void csvRow(StringBuilder csv, Object... values) {
        for (int index = 0; index < values.length; index++) {
            if (index > 0) {
                csv.append(',');
            }
            csv.append(csvCell(values[index]));
        }
        csv.append("\r\n");
    }

    private static String csvCell(Object value) {
        String text = value == null ? "" : value.toString();
        if (!text.isEmpty() && "=+-@".indexOf(text.charAt(0)) >= 0) {
            text = "'" + text;
        }
        return "\"" + text.replace("\"", "\"\"") + "\"";
    }

    private static byte[] utf8Csv(StringBuilder csv) {
        return ("\uFEFF" + csv).getBytes(StandardCharsets.UTF_8);
    }
}
