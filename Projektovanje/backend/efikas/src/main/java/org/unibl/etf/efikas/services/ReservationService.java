package org.unibl.etf.efikas.services;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.unibl.etf.efikas.exceptions.DomainConflictException;
import org.unibl.etf.efikas.models.entities.*;
import org.unibl.etf.efikas.models.enums.ReservationStatus;
import org.unibl.etf.efikas.models.requests.ChangeReservationStatusRequest;
import org.unibl.etf.efikas.models.requests.CreateReservationRequest;
import org.unibl.etf.efikas.models.requests.UpdateReservationStayRequest;
import org.unibl.etf.efikas.models.responses.*;
import org.unibl.etf.efikas.repositories.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReservationService {
    private final ReservationRepository reservationRepository;
    private final ReservationStatusHistoryRepository statusHistoryRepository;
    private final ApartmentRepository apartmentRepository;
    private final ApartmentUnavailabilityRepository unavailabilityRepository;
    private final AppUserRepository appUserRepository;

    @Transactional(readOnly = true)
    public PageResponse<AvailableApartmentResponse> findAvailability(
            LocalDate checkInDate,
            LocalDate checkOutDate,
            Integer guestCount,
            Integer apartmentTypeId,
            Pageable pageable
    ) {
        validatePeriod(checkInDate, checkOutDate);
        Page<AvailableApartmentResponse> page = apartmentRepository
                .findAvailable(checkInDate, checkOutDate, guestCount, apartmentTypeId, pageable)
                .map(ReservationService::toAvailableApartment);
        return PageResponse.from(page);
    }

    @Transactional(readOnly = true)
    public PageResponse<ReservationDetailsResponse> findAll(
            Integer apartmentId,
            ReservationStatus status,
            LocalDate from,
            LocalDate to,
            Pageable pageable
    ) {
        if ((from == null) != (to == null)) {
            throw new IllegalArgumentException("Both from and to are required when filtering by stay period.");
        }
        if (from != null) {
            validatePeriod(from, to);
        }
        Specification<Reservation> specification = Specification.unrestricted();
        if (apartmentId != null) {
            specification = specification.and((root, query, builder) ->
                    builder.equal(root.get("apartment").get("apartmentId"), apartmentId));
        }
        if (status != null) {
            specification = specification.and((root, query, builder) -> builder.equal(root.get("status"), status));
        }
        if (from != null) {
            specification = specification.and((root, query, builder) -> builder.and(
                    builder.lessThan(root.get("checkInDate"), to),
                    builder.greaterThan(root.get("checkOutDate"), from)));
        }
        return PageResponse.from(reservationRepository.findAll(specification, pageable).map(ReservationService::toResponse));
    }

    @Transactional(readOnly = true)
    public ReservationDetailsResponse findById(Integer reservationId) {
        return toResponse(requireReservation(reservationId));
    }

    @Transactional
    public ReservationDetailsResponse create(CreateReservationRequest request, String actorEmail) {
        validatePeriod(request.checkInDate(), request.checkOutDate());
        Apartment apartment = apartmentRepository.findByIdForUpdate(request.apartmentId())
                .orElseThrow(() -> new EntityNotFoundException("Apartment not found."));
        validateApartment(apartment, request.guestCount());
        ensureAvailable(apartment.getApartmentId(), request.checkInDate(), request.checkOutDate(), null);

        Reservation reservation = new Reservation();
        reservation.setApartment(apartment);
        reservation.setCheckInDate(request.checkInDate());
        reservation.setCheckOutDate(request.checkOutDate());
        reservation.setGuestQuantity(request.guestCount());
        reservation.setNightlyRate(request.nightlyRate() == null
                ? apartment.getType().getDefaultNightlyRate()
                : request.nightlyRate());
        reservation.setNote(normalizeNullable(request.note()));
        reservation.setStatus(ReservationStatus.CONFIRMED);
        AppUser actor = requireActor(actorEmail);
        reservation.setCreatedBy(actor);

        Reservation saved = reservationRepository.save(reservation);
        appendStatus(saved, ReservationStatus.CONFIRMED, actor, "Reservation created.");
        reservationRepository.flush();
        return toResponse(saved);
    }

    @Transactional
    public ReservationDetailsResponse updateStay(
            Integer reservationId, UpdateReservationStayRequest request, String actorEmail
    ) {
        Reservation reservation = lockReservation(reservationId);
        if (reservation.getStatus() != ReservationStatus.CONFIRMED) {
            throw new DomainConflictException("Only a confirmed reservation stay can be changed.");
        }
        validatePeriod(reservation.getCheckInDate(), request.checkOutDate());
        ensureAvailable(
                reservation.getApartment().getApartmentId(), reservation.getCheckInDate(),
                request.checkOutDate(), reservationId);
        reservation.setCheckOutDate(request.checkOutDate());
        reservationRepository.saveAndFlush(reservation);
        return toResponse(reservation);
    }

    @Transactional
    public ReservationDetailsResponse changeStatus(
            Integer reservationId, ChangeReservationStatusRequest request, String actorEmail
    ) {
        Reservation reservation = lockReservation(reservationId);
        if (reservation.getStatus() == request.status()) {
            return toResponse(reservation);
        }
        if (reservation.getStatus() != ReservationStatus.CONFIRMED
                || (request.status() != ReservationStatus.CANCELLED && request.status() != ReservationStatus.NO_SHOW)) {
            throw new DomainConflictException("B03 allows only CONFIRMED to CANCELLED or NO_SHOW transitions.");
        }
        if (request.status() == ReservationStatus.NO_SHOW
                && LocalDate.now().isBefore(reservation.getCheckInDate())) {
            throw new DomainConflictException("A reservation cannot be marked no-show before its check-in date.");
        }
        AppUser actor = requireActor(actorEmail);
        reservation.setStatus(request.status());
        appendStatus(reservation, request.status(), actor, request.reason().trim());
        reservationRepository.flush();
        return toResponse(reservation);
    }

    @Transactional(readOnly = true)
    public List<ReservationStatusHistoryResponse> statusHistory(Integer reservationId) {
        requireReservation(reservationId);
        return statusHistoryRepository
                .findByReservationReservationIdOrderByChangedAtDescReservationStatusHistoryIdDesc(reservationId)
                .stream().map(ReservationService::toHistoryResponse).toList();
    }

    private void ensureAvailable(
            Integer apartmentId, LocalDate checkInDate, LocalDate checkOutDate, Integer excludedReservationId
    ) {
        boolean reservationConflict = excludedReservationId == null
                ? reservationRepository.existsBlocking(apartmentId, checkInDate, checkOutDate)
                : reservationRepository.existsBlockingExcluding(
                        apartmentId, checkInDate, checkOutDate, excludedReservationId);
        if (reservationConflict || unavailabilityRepository.existsForStay(apartmentId, checkInDate, checkOutDate)) {
            throw new DomainConflictException("The apartment is not available for the requested stay.");
        }
    }

    private static void validateApartment(Apartment apartment, Integer guestCount) {
        if (!apartment.isActive() || !apartment.getType().isActive()) {
            throw new DomainConflictException("The apartment or its type is inactive.");
        }
        if (guestCount > apartment.getType().getCapacity()) {
            throw new DomainConflictException("Guest count exceeds the apartment type capacity.");
        }
    }

    private static void validatePeriod(LocalDate checkInDate, LocalDate checkOutDate) {
        if (checkInDate == null || checkOutDate == null || !checkInDate.isBefore(checkOutDate)) {
            throw new IllegalArgumentException("Check-in date must be before check-out date.");
        }
    }

    private Reservation requireReservation(Integer id) {
        return reservationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Reservation not found."));
    }

    private Reservation lockReservation(Integer id) {
        return reservationRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new EntityNotFoundException("Reservation not found."));
    }

    private AppUser requireActor(String email) {
        return appUserRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new EntityNotFoundException("Authenticated user not found."));
    }

    private void appendStatus(Reservation reservation, ReservationStatus status, AppUser actor, String reason) {
        ReservationStatusHistory history = new ReservationStatusHistory();
        history.setReservation(reservation);
        history.setStatus(status);
        history.setChangedBy(actor);
        history.setReason(reason);
        statusHistoryRepository.save(history);
    }

    private static AvailableApartmentResponse toAvailableApartment(Apartment apartment) {
        ApartmentType type = apartment.getType();
        return new AvailableApartmentResponse(
                apartment.getApartmentId(), apartment.getName(), apartment.getAddress(), apartment.getFloor(),
                type.getApartmentTypeId(), type.getName(), type.getCapacity(), type.getDefaultNightlyRate());
    }

    private static ReservationDetailsResponse toResponse(Reservation reservation) {
        long nights = ChronoUnit.DAYS.between(reservation.getCheckInDate(), reservation.getCheckOutDate());
        BigDecimal total = reservation.getNightlyRate().multiply(BigDecimal.valueOf(nights));
        return new ReservationDetailsResponse(
                reservation.getReservationId(), reservation.getApartment().getApartmentId(),
                reservation.getApartment().getName(), reservation.getCheckInDate(), reservation.getCheckOutDate(),
                nights, reservation.getGuestQuantity(), reservation.getNightlyRate(), total, reservation.getNote(),
                reservation.getStatus(), reservation.getCreatedBy().getUserId(), reservation.getVersion(),
                reservation.getCreatedAt(), reservation.getUpdatedAt());
    }

    private static ReservationStatusHistoryResponse toHistoryResponse(ReservationStatusHistory history) {
        return new ReservationStatusHistoryResponse(
                history.getReservationStatusHistoryId(), history.getStatus(), history.getReason(),
                history.getChangedBy() == null ? null : history.getChangedBy().getUserId(), history.getChangedAt());
    }

    private static String normalizeNullable(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
