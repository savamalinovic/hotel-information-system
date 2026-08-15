package org.unibl.etf.efikas.services;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.unibl.etf.efikas.exceptions.DomainConflictException;
import org.unibl.etf.efikas.models.entities.*;
import org.unibl.etf.efikas.models.enums.ApartmentOperationalStatus;
import org.unibl.etf.efikas.models.enums.CheckInClaimAction;
import org.unibl.etf.efikas.models.enums.GuestBookType;
import org.unibl.etf.efikas.models.enums.ReservationStatus;
import org.unibl.etf.efikas.models.enums.AuditEvent;
import org.unibl.etf.efikas.models.responses.CheckInClaimHistoryResponse;
import org.unibl.etf.efikas.models.responses.CheckInClaimResponse;
import org.unibl.etf.efikas.models.responses.CheckInResponse;
import org.unibl.etf.efikas.repositories.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CheckInService {
    private static final ZoneId HOTEL_ZONE = ZoneId.of("Europe/Sarajevo");

    private final ReservationRepository reservationRepository;
    private final ReservationGuestRepository reservationGuestRepository;
    private final ReservationCheckInClaimHistoryRepository claimHistoryRepository;
    private final ReservationStatusHistoryRepository statusHistoryRepository;
    private final GuestBookEntryRepository guestBookEntryRepository;
    private final AppUserRepository appUserRepository;
    private final AuditLogService auditLogService;

    @Transactional
    public CheckInClaimResponse claim(Integer reservationId, String actorEmail) {
        Reservation reservation = lockClaimableReservation(reservationId);
        AppUser actor = requireActor(actorEmail);
        if (reservation.getCheckInClaimedBy() != null) {
            if (reservation.getCheckInClaimedBy().getUserId().equals(actor.getUserId())) {
                return toClaimResponse(reservation);
            }
            throw new DomainConflictException("The check-in is already claimed by another agent.");
        }

        Instant now = Instant.now();
        reservation.setCheckInClaimedBy(actor);
        reservation.setCheckInClaimedAt(now);
        appendClaimHistory(reservation, CheckInClaimAction.CLAIMED, null, actor, actor);
        auditLogService.record(AuditEvent.CHECK_IN_CLAIMED, actor, reservation, reservation.getApartment(), null,
                "Check-in claimed.");
        reservationRepository.flush();
        return toClaimResponse(reservation);
    }

    @Transactional
    public CheckInClaimResponse release(Integer reservationId, String actorEmail) {
        Reservation reservation = lockClaimableReservation(reservationId);
        AppUser actor = requireActor(actorEmail);
        AppUser current = reservation.getCheckInClaimedBy();
        if (current == null) {
            return toClaimResponse(reservation);
        }
        if (!current.getUserId().equals(actor.getUserId())) {
            throw new DomainConflictException("Only the current claimer can release this check-in.");
        }

        reservation.setCheckInClaimedBy(null);
        reservation.setCheckInClaimedAt(null);
        appendClaimHistory(reservation, CheckInClaimAction.RELEASED, current, null, actor);
        auditLogService.record(AuditEvent.CHECK_IN_CLAIM_RELEASED, actor, reservation, reservation.getApartment(), null,
                "Check-in claim released.");
        reservationRepository.flush();
        return toClaimResponse(reservation);
    }

    @Transactional
    public CheckInClaimResponse takeover(Integer reservationId, String actorEmail) {
        Reservation reservation = lockClaimableReservation(reservationId);
        AppUser actor = requireActor(actorEmail);
        AppUser current = reservation.getCheckInClaimedBy();
        if (current == null) {
            throw new DomainConflictException("An unclaimed check-in must be claimed, not taken over.");
        }
        if (current.getUserId().equals(actor.getUserId())) {
            return toClaimResponse(reservation);
        }

        reservation.setCheckInClaimedBy(actor);
        reservation.setCheckInClaimedAt(Instant.now());
        appendClaimHistory(reservation, CheckInClaimAction.TAKEN_OVER, current, actor, actor);
        auditLogService.record(AuditEvent.CHECK_IN_CLAIM_TAKEN_OVER, actor, reservation, reservation.getApartment(), null,
                "Check-in claim taken over.");
        reservationRepository.flush();
        return toClaimResponse(reservation);
    }

    @Transactional(readOnly = true)
    public List<CheckInClaimHistoryResponse> claimHistory(Integer reservationId) {
        requireReservation(reservationId);
        return claimHistoryRepository
                .findByReservationReservationIdOrderByPerformedAtDescReservationCheckInClaimHistoryIdDesc(reservationId)
                .stream().map(CheckInService::toClaimHistoryResponse).toList();
    }

    @Transactional
    public CheckInResponse checkIn(Integer reservationId, String actorEmail) {
        Reservation reservation = lockReservation(reservationId);
        if (reservation.getStatus() == ReservationStatus.CHECKED_IN) {
            return new CheckInResponse(
                    ReservationService.toResponse(reservation),
                    Math.toIntExact(guestBookEntryRepository.countByReservationReservationId(reservationId)),
                    reservation.getCheckedInBy().getUserId(), reservation.getCheckedInAt());
        }
        if (reservation.getStatus() != ReservationStatus.CONFIRMED) {
            throw new DomainConflictException("Only a confirmed reservation can be checked in.");
        }

        LocalDate today = LocalDate.now(HOTEL_ZONE);
        if (today.isBefore(reservation.getCheckInDate()) || !today.isBefore(reservation.getCheckOutDate())) {
            throw new DomainConflictException("Check-in is allowed from the arrival date until before departure.");
        }
        Apartment apartment = reservation.getApartment();
        if (!apartment.isActive() || apartment.getOperationalStatus() != ApartmentOperationalStatus.READY) {
            throw new DomainConflictException("The apartment must be active and READY for check-in.");
        }

        List<ReservationGuest> guests = reservationGuestRepository
                .findByReservationReservationIdOrderByPrimaryGuestDescCreatedAtAsc(reservationId);
        if (guests.size() != reservation.getGuestQuantity()) {
            throw new DomainConflictException("All declared reservation guests must be recorded before check-in.");
        }
        if (guests.stream().filter(ReservationGuest::isPrimaryGuest).count() != 1) {
            throw new DomainConflictException("Exactly one reservation guest must be marked as primary.");
        }
        guests.forEach(link -> validateForCheckIn(link.getGuest(), today));

        AppUser actor = requireActor(actorEmail);
        Instant now = Instant.now();
        List<GuestBookEntry> entries = guests.stream()
                .map(link -> toBookEntry(reservation, link.getGuest(), actor, now))
                .toList();
        guestBookEntryRepository.saveAllAndFlush(entries);

        reservation.setStatus(ReservationStatus.CHECKED_IN);
        reservation.setCheckedInBy(actor);
        reservation.setCheckedInAt(now);
        reservation.setCheckInClaimedBy(null);
        reservation.setCheckInClaimedAt(null);
        appendStatus(reservation, actor);
        auditLogService.record(AuditEvent.RESERVATION_CHECKED_IN, actor, reservation, apartment, null,
                "Reservation checked in.");
        reservationRepository.flush();

        return new CheckInResponse(
                ReservationService.toResponse(reservation), entries.size(), actor.getUserId(), now);
    }

    private Reservation lockClaimableReservation(Integer reservationId) {
        Reservation reservation = lockReservation(reservationId);
        if (reservation.getStatus() != ReservationStatus.CONFIRMED) {
            throw new DomainConflictException("Only a confirmed reservation check-in can be claimed.");
        }
        if (!LocalDate.now(HOTEL_ZONE).isBefore(reservation.getCheckOutDate())) {
            throw new DomainConflictException("A completed stay window cannot be claimed.");
        }
        return reservation;
    }

    private Reservation lockReservation(Integer reservationId) {
        return reservationRepository.findByIdForUpdate(reservationId)
                .orElseThrow(() -> new EntityNotFoundException("Reservation not found."));
    }

    private Reservation requireReservation(Integer reservationId) {
        return reservationRepository.findById(reservationId)
                .orElseThrow(() -> new EntityNotFoundException("Reservation not found."));
    }

    private AppUser requireActor(String email) {
        return appUserRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new EntityNotFoundException("Authenticated user not found."));
    }

    private void appendClaimHistory(
            Reservation reservation,
            CheckInClaimAction action,
            AppUser previous,
            AppUser claimedBy,
            AppUser performedBy
    ) {
        ReservationCheckInClaimHistory history = new ReservationCheckInClaimHistory();
        history.setReservation(reservation);
        history.setAction(action);
        history.setPreviousClaimedBy(previous);
        history.setClaimedBy(claimedBy);
        history.setPerformedBy(performedBy);
        claimHistoryRepository.save(history);
    }

    private void appendStatus(Reservation reservation, AppUser actor) {
        ReservationStatusHistory history = new ReservationStatusHistory();
        history.setReservation(reservation);
        history.setStatus(ReservationStatus.CHECKED_IN);
        history.setChangedBy(actor);
        history.setReason("Guest check-in completed.");
        statusHistoryRepository.save(history);
    }

    private static void validateForCheckIn(Guest guest, LocalDate today) {
        GuestService.validateGuest(guest);
        if (!guest.isLocal() && guest.getEntryDate().isAfter(today)) {
            throw new DomainConflictException("A foreign guest entry date cannot be after the check-in date.");
        }
        if (!guest.isLocal() && guest.getPermittedResidenceDate() != null
                && guest.getPermittedResidenceDate().isBefore(today)) {
            throw new DomainConflictException("A foreign guest permitted residence has expired.");
        }
    }

    private static GuestBookEntry toBookEntry(
            Reservation reservation, Guest guest, AppUser actor, Instant arrivedAt
    ) {
        GuestBookEntry entry = new GuestBookEntry();
        entry.setReservation(reservation);
        entry.setGuest(guest);
        entry.setBookType(guest.isLocal() ? GuestBookType.DOMESTIC : GuestBookType.FOREIGN);
        entry.setCitizenId(guest.getCitizenId());
        entry.setPersonalDocumentUrl(guest.getPersonalDocumentUrl());
        entry.setName(guest.getName());
        entry.setSurname(guest.getSurname());
        entry.setGender(guest.getGender());
        entry.setPhoneNumber(guest.getPhoneNumber());
        entry.setBirthDate(guest.getBirthDate());
        entry.setBirthPlace(guest.getBirthPlace());
        entry.setBirthMunicipality(guest.getBirthMunicipality());
        entry.setBirthCountry(guest.getBirthCountry());
        entry.setAddress(guest.getAddress());
        entry.setCitizenship(guest.getCitizenship());
        entry.setPassportNumber(guest.getPassportNumber());
        entry.setPassportIssuedDate(guest.getPassportIssuedDate());
        entry.setVisaType(guest.getVisaType());
        entry.setVisaNumber(guest.getVisaNumber());
        entry.setPermittedResidenceDate(guest.getPermittedResidenceDate());
        entry.setEntryDate(guest.getEntryDate());
        entry.setEntryPlace(guest.getEntryPlace());
        entry.setApartment(reservation.getApartment());
        entry.setApartmentName(reservation.getApartment().getName());
        entry.setApartmentFloor(reservation.getApartment().getFloor());
        entry.setArrivedAt(arrivedAt);
        entry.setPlannedDepartureDate(reservation.getCheckOutDate());
        entry.setCheckedInBy(actor);
        return entry;
    }

    private static CheckInClaimResponse toClaimResponse(Reservation reservation) {
        AppUser claimedBy = reservation.getCheckInClaimedBy();
        return new CheckInClaimResponse(
                reservation.getReservationId(), claimedBy == null ? null : claimedBy.getUserId(),
                claimedBy == null ? null : claimedBy.getName() + " " + claimedBy.getSurname(),
                reservation.getCheckInClaimedAt());
    }

    private static CheckInClaimHistoryResponse toClaimHistoryResponse(ReservationCheckInClaimHistory history) {
        return new CheckInClaimHistoryResponse(
                history.getReservationCheckInClaimHistoryId(), history.getAction(),
                history.getPreviousClaimedBy() == null ? null : history.getPreviousClaimedBy().getUserId(),
                history.getClaimedBy() == null ? null : history.getClaimedBy().getUserId(),
                history.getPerformedBy().getUserId(), history.getPerformedAt());
    }
}
