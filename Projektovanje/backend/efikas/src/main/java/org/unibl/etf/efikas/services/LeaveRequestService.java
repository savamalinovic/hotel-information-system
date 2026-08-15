package org.unibl.etf.efikas.services;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.unibl.etf.efikas.exceptions.DomainConflictException;
import org.unibl.etf.efikas.models.entities.AppUser;
import org.unibl.etf.efikas.models.entities.LeaveRequest;
import org.unibl.etf.efikas.models.enums.LeaveRequestStatus;
import org.unibl.etf.efikas.models.enums.UserRole;
import org.unibl.etf.efikas.models.requests.CreateLeaveRequest;
import org.unibl.etf.efikas.models.responses.LeaveRequestResponse;
import org.unibl.etf.efikas.models.responses.PageResponse;
import org.unibl.etf.efikas.repositories.AppUserRepository;
import org.unibl.etf.efikas.repositories.LeaveRequestRepository;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class LeaveRequestService {
    private final AppUserRepository appUserRepository;
    private final LeaveRequestRepository leaveRequestRepository;

    @Transactional
    public LeaveRequestResponse create(String workerEmail, CreateLeaveRequest input) {
        AppUser worker = requireWorkerForUpdate(workerEmail);
        Instant now = Instant.now();
        if (!input.endsAt().isAfter(input.startsAt())) {
            throw new IllegalArgumentException("Leave end must be after its start.");
        }
        if (!input.endsAt().isAfter(now)) {
            throw new IllegalArgumentException("Leave end must be in the future.");
        }
        if (leaveRequestRepository.existsActiveOverlap(worker.getUserId(), input.startsAt(), input.endsAt())) {
            throw new DomainConflictException("The worker already has an overlapping active leave request.");
        }
        LeaveRequest request = new LeaveRequest();
        request.setWorker(worker);
        request.setStartsAt(input.startsAt());
        request.setEndsAt(input.endsAt());
        request.setReason(input.reason().trim());
        request.setStatus(LeaveRequestStatus.PENDING);
        request.setCreatedAt(now);
        return toResponse(leaveRequestRepository.saveAndFlush(request));
    }

    @Transactional(readOnly = true)
    public PageResponse<LeaveRequestResponse> mine(String workerEmail, Pageable pageable) {
        AppUser worker = requireWorker(workerEmail);
        return PageResponse.from(leaveRequestRepository
                .findByWorkerUserIdOrderByCreatedAtDescLeaveRequestIdDesc(worker.getUserId(), pageable)
                .map(LeaveRequestService::toResponse));
    }

    @Transactional
    public LeaveRequestResponse cancel(String workerEmail, Long requestId) {
        AppUser worker = requireWorkerForUpdate(workerEmail);
        LeaveRequest request = leaveRequestRepository.findOwnedByIdForUpdate(requestId, worker.getUserId())
                .orElseThrow(() -> new EntityNotFoundException("Leave request not found."));
        if (request.getStatus() == LeaveRequestStatus.CANCELLED) {
            return toResponse(request);
        }
        if (request.getStatus() != LeaveRequestStatus.PENDING
                && request.getStatus() != LeaveRequestStatus.APPROVED) {
            throw new DomainConflictException("Only a pending or approved leave request can be cancelled.");
        }
        if (!request.getEndsAt().isAfter(Instant.now())) {
            throw new DomainConflictException("An ended leave request cannot be cancelled.");
        }
        request.setStatus(LeaveRequestStatus.CANCELLED);
        request.setCancelledBy(worker);
        request.setCancelledAt(Instant.now());
        leaveRequestRepository.flush();
        return toResponse(request);
    }

    @Transactional(readOnly = true)
    public PageResponse<LeaveRequestResponse> list(
            Integer workerId, LeaveRequestStatus status, Pageable pageable
    ) {
        if (workerId != null && status != null) {
            return PageResponse.from(leaveRequestRepository.findByWorkerUserIdAndStatus(workerId, status, pageable)
                    .map(LeaveRequestService::toResponse));
        }
        if (workerId != null) {
            return PageResponse.from(leaveRequestRepository.findByWorkerUserId(workerId, pageable)
                    .map(LeaveRequestService::toResponse));
        }
        if (status != null) {
            return PageResponse.from(leaveRequestRepository.findByStatus(status, pageable)
                    .map(LeaveRequestService::toResponse));
        }
        return PageResponse.from(leaveRequestRepository.findAll(pageable).map(LeaveRequestService::toResponse));
    }

    @Transactional
    public LeaveRequestResponse approve(String managerEmail, Long requestId) {
        return decide(managerEmail, requestId, LeaveRequestStatus.APPROVED, null);
    }

    @Transactional
    public LeaveRequestResponse reject(String managerEmail, Long requestId, String reason) {
        return decide(managerEmail, requestId, LeaveRequestStatus.REJECTED, reason.trim());
    }

    private LeaveRequestResponse decide(
            String managerEmail, Long requestId, LeaveRequestStatus status, String reason
    ) {
        AppUser manager = requireManager(managerEmail);
        LeaveRequest snapshot = leaveRequestRepository.findById(requestId)
                .orElseThrow(() -> new EntityNotFoundException("Leave request not found."));
        AppUser worker = appUserRepository.findByEmailIgnoreCaseForUpdate(snapshot.getWorker().getEmail())
                .map(LeaveRequestService::validateWorker)
                .orElseThrow();
        LeaveRequest request = leaveRequestRepository.findByIdForUpdate(requestId)
                .orElseThrow(() -> new EntityNotFoundException("Leave request not found."));
        if (request.getStatus() != LeaveRequestStatus.PENDING) {
            throw new DomainConflictException("Only a pending leave request can be decided.");
        }
        if (!request.getEndsAt().isAfter(Instant.now())) {
            throw new DomainConflictException("An ended leave request cannot be decided.");
        }
        if (!request.getWorker().getUserId().equals(worker.getUserId())) {
            throw new DomainConflictException("Leave request worker changed during decision.");
        }
        request.setStatus(status);
        request.setDecidedBy(manager);
        request.setDecidedAt(Instant.now());
        request.setDecisionReason(reason);
        leaveRequestRepository.flush();
        return toResponse(request);
    }

    private AppUser requireWorker(String email) {
        return validateWorker(appUserRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new EntityNotFoundException("Authenticated user not found.")));
    }

    private AppUser requireWorkerForUpdate(String email) {
        return validateWorker(appUserRepository.findByEmailIgnoreCaseForUpdate(email)
                .orElseThrow(() -> new EntityNotFoundException("Authenticated user not found.")));
    }

    private AppUser requireManager(String email) {
        AppUser manager = appUserRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new EntityNotFoundException("Authenticated user not found."));
        if (!manager.isActive() || manager.getRole() != UserRole.MANAGER) {
            throw new DomainConflictException("Only an active manager can decide leave requests.");
        }
        return manager;
    }

    private static AppUser validateWorker(AppUser worker) {
        if (!worker.isActive() || worker.getRole() != UserRole.OPERATIONAL_WORKER) {
            throw new DomainConflictException("Only an active operational worker can use leave actions.");
        }
        return worker;
    }

    private static LeaveRequestResponse toResponse(LeaveRequest request) {
        return new LeaveRequestResponse(
                request.getLeaveRequestId(), request.getWorker().getUserId(), request.getWorker().getName(),
                request.getWorker().getSurname(), request.getStartsAt(), request.getEndsAt(), request.getReason(),
                request.getStatus(), request.getCreatedAt(),
                request.getDecidedBy() == null ? null : request.getDecidedBy().getUserId(), request.getDecidedAt(),
                request.getDecisionReason(),
                request.getCancelledBy() == null ? null : request.getCancelledBy().getUserId(),
                request.getCancelledAt());
    }
}
