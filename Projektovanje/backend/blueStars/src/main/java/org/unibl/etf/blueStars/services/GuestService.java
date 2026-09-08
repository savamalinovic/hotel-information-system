package org.unibl.etf.blueStars.services;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.unibl.etf.blueStars.exceptions.DomainConflictException;
import org.unibl.etf.blueStars.models.entities.AppUser;
import org.unibl.etf.blueStars.models.entities.Guest;
import org.unibl.etf.blueStars.models.entities.Reservation;
import org.unibl.etf.blueStars.models.entities.ReservationGuest;
import org.unibl.etf.blueStars.models.enums.ReservationStatus;
import org.unibl.etf.blueStars.models.requests.AddReservationGuestRequest;
import org.unibl.etf.blueStars.models.requests.GuestRequest;
import org.unibl.etf.blueStars.models.requests.UpdateReservationGuestRequest;
import org.unibl.etf.blueStars.models.responses.GuestResponse;
import org.unibl.etf.blueStars.models.responses.PageResponse;
import org.unibl.etf.blueStars.models.responses.ReservationGuestResponse;
import org.unibl.etf.blueStars.repositories.AppUserRepository;
import org.unibl.etf.blueStars.repositories.GuestRepository;
import org.unibl.etf.blueStars.repositories.ReservationGuestRepository;
import org.unibl.etf.blueStars.repositories.ReservationRepository;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GuestService {
    private final GuestRepository guestRepository;
    private final ReservationGuestRepository reservationGuestRepository;
    private final ReservationRepository reservationRepository;
    private final AppUserRepository appUserRepository;

    @Transactional(readOnly = true)
    public PageResponse<GuestResponse> findAll(String query, Pageable pageable) {
        String normalized = normalizeNullable(query);
        return PageResponse.from(guestRepository.search(normalized, pageable).map(GuestService::toResponse));
    }

    @Transactional(readOnly = true)
    public GuestResponse findById(Integer guestId) {
        return toResponse(requireGuest(guestId));
    }

    @Transactional(readOnly = true)
    public List<ReservationGuestResponse> findReservationGuests(Integer reservationId) {
        requireReservation(reservationId);
        return reservationGuestRepository
                .findByReservationReservationIdOrderByPrimaryGuestDescCreatedAtAsc(reservationId)
                .stream().map(GuestService::toReservationGuestResponse).toList();
    }

    @Transactional
    public ReservationGuestResponse addToReservation(
            Integer reservationId, AddReservationGuestRequest request, String actorEmail
    ) {
        Reservation reservation = lockEditableReservation(reservationId);
        boolean hasExisting = request.existingGuestId() != null;
        boolean hasNew = request.guest() != null;
        if (hasExisting == hasNew) {
            throw new IllegalArgumentException("Provide exactly one of existingGuestId or guest.");
        }
        if (reservationGuestRepository.countByReservationReservationId(reservationId)
                >= reservation.getGuestQuantity()) {
            throw new DomainConflictException("The reservation already has its declared number of guests.");
        }

        Guest guest = hasExisting ? requireGuest(request.existingGuestId()) : createGuest(request.guest());
        if (reservationGuestRepository
                .findByReservationReservationIdAndGuestGuestId(reservationId, guest.getGuestId()).isPresent()) {
            throw new DomainConflictException("The guest is already linked to this reservation.");
        }

        boolean firstGuest = reservationGuestRepository.countByReservationReservationId(reservationId) == 0;
        boolean primary = firstGuest || request.primaryGuest();
        if (primary) {
            demoteCurrentPrimary(reservationId);
        }

        ReservationGuest link = new ReservationGuest();
        link.setReservation(reservation);
        link.setGuest(guest);
        link.setPrimaryGuest(primary);
        link.setAddedBy(requireActor(actorEmail));
        return toReservationGuestResponse(reservationGuestRepository.saveAndFlush(link));
    }

    @Transactional
    public ReservationGuestResponse updateForReservation(
            Integer reservationId, Integer guestId, UpdateReservationGuestRequest request
    ) {
        lockEditableReservation(reservationId);
        ReservationGuest link = requireLink(reservationId, guestId);
        validateGuest(request.guest());
        guestRepository.findByCitizenIdIgnoreCase(request.guest().citizenId().trim())
                .filter(existing -> !existing.getGuestId().equals(guestId))
                .ifPresent(existing -> {
                    throw new DomainConflictException("A guest with this citizen identifier already exists.");
                });

        if (request.primaryGuest()) {
            demoteCurrentPrimary(reservationId);
        } else if (link.isPrimaryGuest()) {
            throw new DomainConflictException("A reservation must keep one primary guest.");
        }
        copy(request.guest(), link.getGuest());
        link.setPrimaryGuest(request.primaryGuest());
        guestRepository.save(link.getGuest());
        return toReservationGuestResponse(reservationGuestRepository.saveAndFlush(link));
    }

    @Transactional
    public void removeFromReservation(Integer reservationId, Integer guestId) {
        lockEditableReservation(reservationId);
        ReservationGuest link = requireLink(reservationId, guestId);
        boolean wasPrimary = link.isPrimaryGuest();
        reservationGuestRepository.delete(link);
        reservationGuestRepository.flush();
        if (wasPrimary) {
            reservationGuestRepository.findByReservationReservationIdOrderByPrimaryGuestDescCreatedAtAsc(reservationId)
                    .stream().findFirst().ifPresent(next -> {
                        next.setPrimaryGuest(true);
                        reservationGuestRepository.save(next);
                    });
        }
    }

    static void validateGuest(GuestRequest request) {
        if (request.local()) {
            requireText(request.birthMunicipality(), "Birth municipality is required for a domestic guest.");
        } else {
            requireText(request.citizenship(), "Citizenship is required for a foreign guest.");
            requireText(request.passportNumber(), "Passport number is required for a foreign guest.");
            if (request.passportIssuedDate() == null) {
                throw new IllegalArgumentException("Passport issue date is required for a foreign guest.");
            }
            if (request.passportIssuedDate().isAfter(LocalDate.now())) {
                throw new IllegalArgumentException("Passport issue date cannot be in the future.");
            }
            if (request.entryDate() == null) {
                throw new IllegalArgumentException("Entry date is required for a foreign guest.");
            }
            requireText(request.entryPlace(), "Entry place is required for a foreign guest.");
        }
    }

    static void validateGuest(Guest guest) {
        GuestRequest request = new GuestRequest(
                guest.getCitizenId(), guest.isLocal(), guest.getPersonalDocumentUrl(), guest.getName(),
                guest.getSurname(), guest.getGender(), guest.getPhoneNumber(), guest.getBirthDate(),
                guest.getBirthPlace(), guest.getBirthMunicipality(), guest.getBirthCountry(), guest.getAddress(),
                guest.getCitizenship(), guest.getPassportNumber(), guest.getPassportIssuedDate(), guest.getVisaType(),
                guest.getVisaNumber(), guest.getPermittedResidenceDate(), guest.getEntryDate(), guest.getEntryPlace());
        validateGuest(request);
    }

    private Guest createGuest(GuestRequest request) {
        validateGuest(request);
        String citizenId = request.citizenId().trim();
        guestRepository.findByCitizenIdIgnoreCase(citizenId).ifPresent(existing -> {
            throw new DomainConflictException("A guest with this citizen identifier already exists.");
        });
        Guest guest = new Guest();
        copy(request, guest);
        return guestRepository.saveAndFlush(guest);
    }

    private Reservation lockEditableReservation(Integer reservationId) {
        Reservation reservation = reservationRepository.findByIdForUpdate(reservationId)
                .orElseThrow(() -> new EntityNotFoundException("Reservation not found."));
        if (reservation.getStatus() != ReservationStatus.CONFIRMED) {
            throw new DomainConflictException("Guests can be changed only while the reservation is confirmed.");
        }
        return reservation;
    }

    private void demoteCurrentPrimary(Integer reservationId) {
        reservationGuestRepository.findByReservationReservationIdAndPrimaryGuestTrue(reservationId)
                .ifPresent(current -> {
                    current.setPrimaryGuest(false);
                    reservationGuestRepository.saveAndFlush(current);
                });
    }

    private ReservationGuest requireLink(Integer reservationId, Integer guestId) {
        return reservationGuestRepository.findByReservationReservationIdAndGuestGuestId(reservationId, guestId)
                .orElseThrow(() -> new EntityNotFoundException("Reservation guest not found."));
    }

    private Reservation requireReservation(Integer reservationId) {
        return reservationRepository.findById(reservationId)
                .orElseThrow(() -> new EntityNotFoundException("Reservation not found."));
    }

    private Guest requireGuest(Integer guestId) {
        return guestRepository.findById(guestId)
                .orElseThrow(() -> new EntityNotFoundException("Guest not found."));
    }

    private AppUser requireActor(String email) {
        return appUserRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new EntityNotFoundException("Authenticated user not found."));
    }

    private static void copy(GuestRequest request, Guest guest) {
        guest.setCitizenId(request.citizenId().trim());
        guest.setLocal(request.local());
        guest.setPersonalDocumentUrl(normalizeNullable(request.personalDocumentUrl()));
        guest.setName(request.name().trim());
        guest.setSurname(request.surname().trim());
        guest.setGender(request.gender());
        guest.setPhoneNumber(normalizeNullable(request.phoneNumber()));
        guest.setBirthDate(request.birthDate());
        guest.setBirthPlace(request.birthPlace().trim());
        guest.setBirthMunicipality(normalizeNullable(request.birthMunicipality()));
        guest.setBirthCountry(request.birthCountry().trim());
        guest.setAddress(request.address().trim());
        guest.setCitizenship(normalizeNullable(request.citizenship()));
        guest.setPassportNumber(normalizeNullable(request.passportNumber()));
        guest.setPassportIssuedDate(request.passportIssuedDate());
        guest.setVisaType(normalizeNullable(request.visaType()));
        guest.setVisaNumber(normalizeNullable(request.visaNumber()));
        guest.setPermittedResidenceDate(request.permittedResidenceDate());
        guest.setEntryDate(request.entryDate());
        guest.setEntryPlace(normalizeNullable(request.entryPlace()));
    }

    static GuestResponse toResponse(Guest guest) {
        return new GuestResponse(
                guest.getGuestId(), guest.getCitizenId(), guest.isLocal(), guest.getPersonalDocumentUrl(),
                guest.getName(), guest.getSurname(), guest.getGender(), guest.getPhoneNumber(), guest.getBirthDate(),
                guest.getBirthPlace(), guest.getBirthMunicipality(), guest.getBirthCountry(), guest.getAddress(),
                guest.getCitizenship(), guest.getPassportNumber(), guest.getPassportIssuedDate(), guest.getVisaType(),
                guest.getVisaNumber(), guest.getPermittedResidenceDate(), guest.getEntryDate(), guest.getEntryPlace(),
                guest.getVersion(), guest.getCreatedAt(), guest.getUpdatedAt());
    }

    private static ReservationGuestResponse toReservationGuestResponse(ReservationGuest link) {
        return new ReservationGuestResponse(
                link.getReservationGuestId(), link.isPrimaryGuest(), link.getAddedBy().getUserId(),
                link.getCreatedAt(), toResponse(link.getGuest()));
    }

    private static void requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
    }

    private static String normalizeNullable(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
