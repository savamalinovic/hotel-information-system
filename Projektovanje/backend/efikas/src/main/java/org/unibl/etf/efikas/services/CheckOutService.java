package org.unibl.etf.efikas.services;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.unibl.etf.efikas.exceptions.DomainConflictException;
import org.unibl.etf.efikas.models.entities.*;
import org.unibl.etf.efikas.models.enums.*;
import org.unibl.etf.efikas.models.responses.CheckOutResponse;
import org.unibl.etf.efikas.repositories.*;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class CheckOutService {
    private final ReservationRepository reservationRepository;
    private final ReservationStatusHistoryRepository reservationHistoryRepository;
    private final ApartmentRepository apartmentRepository;
    private final ApartmentStatusHistoryRepository apartmentHistoryRepository;
    private final OperationalTaskRepository taskRepository;
    private final TaskStatusHistoryRepository taskHistoryRepository;
    private final SpecializationRepository specializationRepository;
    private final AppUserRepository appUserRepository;
    private final AuditLogService auditLogService;
    private final TaskNotificationService taskNotifications;

    @Transactional
    public CheckOutResponse checkOut(Integer reservationId, String actorEmail) {
        Reservation reservation = reservationRepository.findByIdForUpdate(reservationId)
                .orElseThrow(() -> new EntityNotFoundException("Reservation not found."));

        if (reservation.getStatus() == ReservationStatus.CHECKED_OUT) {
            return existingResult(reservation);
        }
        if (reservation.getStatus() != ReservationStatus.CHECKED_IN) {
            throw new DomainConflictException("Only an active checked-in reservation can be checked out.");
        }

        AppUser actor = appUserRepository.findByEmailIgnoreCase(actorEmail)
                .orElseThrow(() -> new EntityNotFoundException("Authenticated user not found."));
        if (!actor.isActive() || actor.getRole() != UserRole.AGENT) {
            throw new DomainConflictException("Only an active agent can perform check-out.");
        }

        Apartment apartment = apartmentRepository.findByIdForUpdate(reservation.getApartment().getApartmentId())
                .orElseThrow(() -> new EntityNotFoundException("Apartment not found."));
        if (apartment.getOperationalStatus() == ApartmentOperationalStatus.DIRTY) {
            throw new DomainConflictException("Apartment is already DIRTY before reservation check-out.");
        }
        if (taskRepository.findByReservationReservationIdAndSource(reservationId, TaskSource.CHECKOUT).isPresent()) {
            throw new DomainConflictException("Reservation already has a checkout cleaning task without check-out.");
        }

        apartment.setOperationalStatus(ApartmentOperationalStatus.DIRTY);
        apartmentRepository.saveAndFlush(apartment);
        appendApartmentHistory(apartment, actor);

        Specialization cleaning = specializationRepository.findByCode("CLEANING")
                .orElseThrow(() -> new EntityNotFoundException("CLEANING specialization not found."));
        OperationalTask task = new OperationalTask();
        task.setSpecialization(cleaning);
        task.setApartment(apartment);
        task.setReservation(reservation);
        task.setCreatedBy(actor);
        task.setTitle("Clean apartment after check-out");
        task.setDescription("Prepare apartment " + apartment.getName()
                + " after reservation " + reservationId + " check-out.");
        task.setPriority(TaskPriority.NORMAL);
        task.setStatus(TaskStatus.NEW);
        task.setSource(TaskSource.CHECKOUT);
        taskRepository.saveAndFlush(task);
        appendTaskHistory(task, actor);
        taskNotifications.notifyEligibleWorkers(task);

        appendReservationHistory(reservation, actor);
        reservation.setCheckedOutBy(actor);
        reservation.setCheckedOutAt(after(reservation.getCheckedInAt()));
        reservation.setStatus(ReservationStatus.CHECKED_OUT);
        reservationRepository.saveAndFlush(reservation);
        auditLogService.record(AuditEvent.RESERVATION_CHECKED_OUT, actor, reservation, apartment, task,
                "Reservation checked out and cleaning task created.");

        return toResponse(reservation, task);
    }

    private CheckOutResponse existingResult(Reservation reservation) {
        if (reservation.getCheckedOutBy() == null || reservation.getCheckedOutAt() == null) {
            throw new DomainConflictException("Checked-out reservation is missing executor metadata.");
        }
        OperationalTask task = taskRepository
                .findByReservationReservationIdAndSource(reservation.getReservationId(), TaskSource.CHECKOUT)
                .orElseThrow(() -> new DomainConflictException(
                        "Checked-out reservation is missing its cleaning task."));
        return toResponse(reservation, task);
    }

    private void appendApartmentHistory(Apartment apartment, AppUser actor) {
        ApartmentStatusHistory history = new ApartmentStatusHistory();
        history.setApartment(apartment);
        history.setStatus(ApartmentOperationalStatus.DIRTY);
        history.setChangedBy(actor);
        history.setReason("Reservation checked out; apartment requires cleaning.");
        apartmentHistoryRepository.saveAndFlush(history);
    }

    private void appendTaskHistory(OperationalTask task, AppUser actor) {
        TaskStatusHistory history = new TaskStatusHistory();
        history.setTask(task);
        history.setToStatus(TaskStatus.NEW);
        history.setActor(actor);
        history.setReason("Cleaning task created automatically by check-out.");
        taskHistoryRepository.saveAndFlush(history);
    }

    private void appendReservationHistory(Reservation reservation, AppUser actor) {
        ReservationStatusHistory history = new ReservationStatusHistory();
        history.setReservation(reservation);
        history.setStatus(ReservationStatus.CHECKED_OUT);
        history.setChangedBy(actor);
        history.setReason("Reservation checked out.");
        reservationHistoryRepository.saveAndFlush(history);
    }

    private static CheckOutResponse toResponse(Reservation reservation, OperationalTask task) {
        return new CheckOutResponse(
                reservation.getReservationId(), reservation.getStatus(),
                reservation.getApartment().getApartmentId(), reservation.getApartment().getOperationalStatus(),
                reservation.getCheckedOutBy().getUserId(), reservation.getCheckedOutAt(), task.getTaskId());
    }

    private static Instant after(Instant instant) {
        Instant now = Instant.now();
        return instant == null || now.isAfter(instant) ? now : instant.plusMillis(1);
    }
}
