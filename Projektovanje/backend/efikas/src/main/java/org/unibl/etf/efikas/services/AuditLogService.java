package org.unibl.etf.efikas.services;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.unibl.etf.efikas.models.entities.*;
import org.unibl.etf.efikas.models.enums.AuditEvent;
import org.unibl.etf.efikas.models.enums.UserRole;
import org.unibl.etf.efikas.models.responses.AuditLogResponse;
import org.unibl.etf.efikas.models.responses.PageResponse;
import org.unibl.etf.efikas.repositories.AuditLogRepository;
import org.unibl.etf.efikas.repositories.AppUserRepository;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class AuditLogService {
    private final AuditLogRepository auditLogRepository;
    private final AppUserRepository appUserRepository;

    /** Appends to the audit trail in the caller's transaction. */
    @Transactional
    public void record(AuditEvent event, AppUser actor, Reservation reservation,
                       Apartment apartment, OperationalTask task, String details) {
        auditLogRepository.save(new AuditLog(event, actor, reservation, apartment, task, normalize(details)));
    }

    @Transactional(readOnly = true)
    public PageResponse<AuditLogResponse> find(
            String managerEmail, Instant from, Instant to, Integer actorId, AuditEvent event,
            Integer reservationId, Integer apartmentId, Long taskId, Pageable pageable
    ) {
        AppUser manager = appUserRepository.findByEmailIgnoreCase(managerEmail)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Authenticated user not found."));
        if (!manager.isActive() || manager.getRole() != UserRole.MANAGER) {
            throw new org.springframework.security.access.AccessDeniedException("Only an active manager can read audit logs.");
        }
        if (from != null && to != null && from.isAfter(to)) {
            throw new IllegalArgumentException("Audit from must not be after to.");
        }
        Specification<AuditLog> specification = Specification.allOf();
        if (from != null) specification = specification.and((root, query, cb) ->
                cb.greaterThanOrEqualTo(root.get("occurredAt"), from));
        if (to != null) specification = specification.and((root, query, cb) ->
                cb.lessThanOrEqualTo(root.get("occurredAt"), to));
        if (actorId != null) specification = specification.and((root, query, cb) ->
                cb.equal(root.get("actor").get("userId"), actorId));
        if (event != null) specification = specification.and((root, query, cb) ->
                cb.equal(root.get("event"), event));
        if (reservationId != null) specification = specification.and((root, query, cb) ->
                cb.equal(root.get("reservation").get("reservationId"), reservationId));
        if (apartmentId != null) specification = specification.and((root, query, cb) ->
                cb.equal(root.get("apartment").get("apartmentId"), apartmentId));
        if (taskId != null) specification = specification.and((root, query, cb) ->
                cb.equal(root.get("task").get("taskId"), taskId));
        return PageResponse.from(auditLogRepository.findAll(specification, pageable).map(AuditLogService::response));
    }

    private static AuditLogResponse response(AuditLog item) {
        return new AuditLogResponse(item.getAuditLogId(), item.getEvent(), item.getOccurredAt(),
                item.getActor().getUserId(),
                item.getReservation() == null ? null : item.getReservation().getReservationId(),
                item.getApartment() == null ? null : item.getApartment().getApartmentId(),
                item.getTask() == null ? null : item.getTask().getTaskId(), item.getDetails());
    }

    private static String normalize(String details) {
        if (details == null || details.isBlank()) return null;
        String normalized = details.trim();
        return normalized.length() <= 500 ? normalized : normalized.substring(0, 500);
    }
}
