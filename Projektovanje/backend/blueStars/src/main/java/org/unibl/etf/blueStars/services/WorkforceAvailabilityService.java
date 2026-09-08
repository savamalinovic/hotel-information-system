package org.unibl.etf.blueStars.services;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.unibl.etf.blueStars.exceptions.DomainConflictException;
import org.unibl.etf.blueStars.models.entities.AppUser;
import org.unibl.etf.blueStars.models.entities.AttendanceSession;
import org.unibl.etf.blueStars.models.entities.AvailabilityOverride;
import org.unibl.etf.blueStars.models.entities.BreakPeriod;
import org.unibl.etf.blueStars.models.entities.LeaveRequest;
import org.unibl.etf.blueStars.models.enums.UserRole;
import org.unibl.etf.blueStars.models.enums.WorkerAvailabilityStatus;
import org.unibl.etf.blueStars.models.requests.CreateAvailabilityOverrideRequest;
import org.unibl.etf.blueStars.models.responses.AttendanceSessionResponse;
import org.unibl.etf.blueStars.models.responses.AvailabilityOverrideResponse;
import org.unibl.etf.blueStars.models.responses.BreakPeriodResponse;
import org.unibl.etf.blueStars.models.responses.PageResponse;
import org.unibl.etf.blueStars.models.responses.WorkerAvailabilityResponse;
import org.unibl.etf.blueStars.repositories.AppUserRepository;
import org.unibl.etf.blueStars.repositories.AttendanceSessionRepository;
import org.unibl.etf.blueStars.repositories.AvailabilityOverrideRepository;
import org.unibl.etf.blueStars.repositories.BreakPeriodRepository;
import org.unibl.etf.blueStars.repositories.LeaveRequestRepository;
import org.unibl.etf.blueStars.repositories.OperationalTaskRepository;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class WorkforceAvailabilityService {
    private final AppUserRepository appUserRepository;
    private final AttendanceSessionRepository attendanceSessionRepository;
    private final BreakPeriodRepository breakPeriodRepository;
    private final AvailabilityOverrideRepository availabilityOverrideRepository;
    private final OperationalTaskRepository operationalTaskRepository;
    private final LeaveRequestRepository leaveRequestRepository;

    @Transactional(readOnly = true)
    public WorkerAvailabilityResponse current(String workerEmail) {
        return currentAvailability(requireParticipant(workerEmail), Instant.now());
    }

    @Transactional(readOnly = true)
    public PageResponse<WorkerAvailabilityResponse> currentParticipants(Pageable pageable, UserRole role) {
        if (role != null) {
            WorkforceParticipantPolicy.requireWorkforceParticipantRole(role);
        }
        Instant now = Instant.now();
        Page<AppUser> participants = role == null
                ? appUserRepository.findByRoleInAndActiveTrue(
                        List.of(UserRole.AGENT, UserRole.OPERATIONAL_WORKER), pageable)
                : appUserRepository.findByRoleAndActiveTrue(role, pageable);
        Page<WorkerAvailabilityResponse> page = participants
                .map(worker -> currentAvailability(worker, now));
        return PageResponse.from(page);
    }

    @Transactional(readOnly = true)
    public WorkforceSnapshot analyticsSnapshot() {
        Instant now = Instant.now();
        long present = 0;
        long available = 0;
        long busy = 0;
        for (AppUser worker : appUserRepository.findAllByRoleAndActiveTrue(UserRole.OPERATIONAL_WORKER)) {
            WorkerAvailabilityResponse current = currentAvailability(worker, now);
            if (current.attendanceSessionId() != null) present++;
            if (current.status() == WorkerAvailabilityStatus.AVAILABLE) available++;
            if (current.status() == WorkerAvailabilityStatus.BUSY) busy++;
        }
        return new WorkforceSnapshot(present, available, busy);
    }

    public record WorkforceSnapshot(long present, long available, long busy) {}

    @Transactional
    public WorkerAvailabilityResponse clockIn(String workerEmail) {
        AppUser worker = lockParticipant(workerEmail);
        if (attendanceSessionRepository.existsByWorkerUserIdAndClockedOutAtIsNull(worker.getUserId())) {
            throw new DomainConflictException("The worker is already clocked in.");
        }
        AttendanceSession session = new AttendanceSession();
        session.setWorker(worker);
        session.setClockedInAt(Instant.now());
        attendanceSessionRepository.saveAndFlush(session);
        return currentAvailability(worker, Instant.now());
    }

    @Transactional
    public WorkerAvailabilityResponse startBreak(String workerEmail) {
        AppUser worker = lockParticipant(workerEmail);
        AttendanceSession session = requireOpenSession(worker.getUserId());
        if (breakPeriodRepository.findByAttendanceSessionAttendanceSessionIdAndEndedAtIsNull(
                session.getAttendanceSessionId()).isPresent()) {
            throw new DomainConflictException("The worker already has an open break.");
        }
        BreakPeriod period = new BreakPeriod();
        period.setAttendanceSession(session);
        period.setStartedAt(Instant.now());
        breakPeriodRepository.saveAndFlush(period);
        return currentAvailability(worker, Instant.now());
    }

    @Transactional
    public WorkerAvailabilityResponse endBreak(String workerEmail) {
        AppUser worker = lockParticipant(workerEmail);
        AttendanceSession session = requireOpenSession(worker.getUserId());
        BreakPeriod period = breakPeriodRepository
                .findByAttendanceSessionAttendanceSessionIdAndEndedAtIsNull(session.getAttendanceSessionId())
                .orElseThrow(() -> new DomainConflictException("The worker does not have an open break."));
        period.setEndedAt(after(period.getStartedAt()));
        breakPeriodRepository.saveAndFlush(period);
        return currentAvailability(worker, Instant.now());
    }

    @Transactional
    public WorkerAvailabilityResponse clockOut(String workerEmail) {
        AppUser worker = lockParticipant(workerEmail);
        AttendanceSession session = requireOpenSession(worker.getUserId());
        if (breakPeriodRepository.findByAttendanceSessionAttendanceSessionIdAndEndedAtIsNull(
                session.getAttendanceSessionId()).isPresent()) {
            throw new DomainConflictException("End the current break before clocking out.");
        }
        session.setClockedOutAt(after(session.getClockedInAt()));
        attendanceSessionRepository.saveAndFlush(session);
        return currentAvailability(worker, Instant.now());
    }

    @Transactional(readOnly = true)
    public PageResponse<AttendanceSessionResponse> attendanceHistory(String workerEmail, Pageable pageable) {
        AppUser worker = requireParticipant(workerEmail);
        return PageResponse.from(attendanceSessionRepository
                .findByWorkerUserIdOrderByClockedInAtDescAttendanceSessionIdDesc(worker.getUserId(), pageable)
                .map(this::toAttendanceResponse));
    }

    @Transactional
    public AvailabilityOverrideResponse createOverride(
            String workerEmail, CreateAvailabilityOverrideRequest request
    ) {
        AppUser worker = lockParticipant(workerEmail);
        Instant now = Instant.now();
        Instant startsAt = request.startsAt() == null ? now : request.startsAt();
        if (request.endsAt() != null && !request.endsAt().isAfter(startsAt)) {
            throw new IllegalArgumentException("Availability override end must be after its start.");
        }
        if (request.endsAt() != null && !request.endsAt().isAfter(now)) {
            throw new IllegalArgumentException("Availability override end must be in the future.");
        }
        boolean overlapping = request.endsAt() == null
                ? availabilityOverrideRepository.existsOverlappingOpenEnded(worker.getUserId(), startsAt)
                : availabilityOverrideRepository.existsOverlappingBounded(
                        worker.getUserId(), startsAt, request.endsAt());
        if (overlapping) {
            throw new DomainConflictException("The worker already has an overlapping availability override.");
        }

        AvailabilityOverride override = new AvailabilityOverride();
        override.setWorker(worker);
        override.setStartsAt(startsAt);
        override.setEndsAt(request.endsAt());
        override.setReason(request.reason().trim());
        override.setCreatedBy(worker);
        override.setCreatedAt(now);
        return toOverrideResponse(availabilityOverrideRepository.saveAndFlush(override));
    }

    @Transactional
    public AvailabilityOverrideResponse clearOverride(String workerEmail, Long overrideId) {
        AppUser worker = lockParticipant(workerEmail);
        AvailabilityOverride override = availabilityOverrideRepository
                .findByAvailabilityOverrideIdAndWorkerUserId(overrideId, worker.getUserId())
                .orElseThrow(() -> new EntityNotFoundException("Availability override not found."));
        if (override.getClearedAt() == null) {
            override.setClearedAt(Instant.now());
            override.setClearedBy(worker);
            availabilityOverrideRepository.flush();
        }
        return toOverrideResponse(override);
    }

    @Transactional(readOnly = true)
    public PageResponse<AvailabilityOverrideResponse> overrideHistory(String workerEmail, Pageable pageable) {
        AppUser worker = requireParticipant(workerEmail);
        return PageResponse.from(availabilityOverrideRepository
                .findByWorkerUserIdOrderByStartsAtDescAvailabilityOverrideIdDesc(worker.getUserId(), pageable)
                .map(WorkforceAvailabilityService::toOverrideResponse));
    }

    private WorkerAvailabilityResponse currentAvailability(AppUser worker, Instant now) {
        AttendanceSession session = attendanceSessionRepository
                .findByWorkerUserIdAndClockedOutAtIsNull(worker.getUserId()).orElse(null);
        AvailabilityOverride override = availabilityOverrideRepository.findCurrent(worker.getUserId(), now)
                .orElse(null);
        LeaveRequest leave = leaveRequestRepository.findCurrentApproved(worker.getUserId(), WorkforceCalendar.today()).orElse(null);
        BreakPeriod openBreak = session == null ? null : breakPeriodRepository
                .findByAttendanceSessionAttendanceSessionIdAndEndedAtIsNull(session.getAttendanceSessionId())
                .orElse(null);
        boolean busy = isBusyFromOperationalTask(worker.getRole(), operationalTaskRepository
                .existsByAssignedWorkerUserIdAndStatusIn(
                worker.getUserId(), List.of(org.unibl.etf.blueStars.models.enums.TaskStatus.ASSIGNED,
                        org.unibl.etf.blueStars.models.enums.TaskStatus.IN_PROGRESS)));
        WorkerAvailabilityStatus status = deriveStatus(
                session != null, leave != null, override != null, openBreak != null, busy);
        return new WorkerAvailabilityResponse(
                worker.getUserId(), worker.getName(), worker.getSurname(), worker.getRole(), status,
                session == null ? null : session.getAttendanceSessionId(),
                session == null ? null : session.getClockedInAt(),
                openBreak == null ? null : openBreak.getStartedAt(),
                override == null ? null : override.getAvailabilityOverrideId(),
                override == null ? null : override.getEndsAt(),
                override == null ? null : override.getReason(),
                leave == null ? null : leave.getLeaveRequestId(),
                leave == null ? null : leave.getEndDate(),
                leave == null ? null : leave.getReason());
    }

    static WorkerAvailabilityStatus deriveStatus(
            boolean clockedIn, boolean unavailableOverride, boolean openBreak, boolean busy
    ) {
        return deriveStatus(clockedIn, false, unavailableOverride, openBreak, busy);
    }

    static WorkerAvailabilityStatus deriveStatus(
            boolean clockedIn, boolean onLeave, boolean unavailableOverride, boolean openBreak, boolean busy
    ) {
        if (onLeave) {
            return WorkerAvailabilityStatus.ON_LEAVE;
        }
        if (!clockedIn) {
            return WorkerAvailabilityStatus.OFF_DUTY;
        }
        if (unavailableOverride) {
            return WorkerAvailabilityStatus.UNAVAILABLE;
        }
        if (openBreak) return WorkerAvailabilityStatus.ON_BREAK;
        return busy ? WorkerAvailabilityStatus.BUSY : WorkerAvailabilityStatus.AVAILABLE;
    }

    static boolean isBusyFromOperationalTask(UserRole role, boolean hasActiveOperationalTask) {
        return role == UserRole.OPERATIONAL_WORKER && hasActiveOperationalTask;
    }

    @Transactional(readOnly = true)
    public void assertAvailableForTask(AppUser worker) {
        if (currentAvailability(worker, Instant.now()).status() != WorkerAvailabilityStatus.AVAILABLE) {
            throw new DomainConflictException("The worker must be present and available to take a task.");
        }
    }

    private AttendanceSession requireOpenSession(Integer workerId) {
        return attendanceSessionRepository.findByWorkerUserIdAndClockedOutAtIsNull(workerId)
                .orElseThrow(() -> new DomainConflictException("The worker is not clocked in."));
    }

    private AppUser requireParticipant(String email) {
        return requireParticipant(appUserRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new EntityNotFoundException("Authenticated user not found.")));
    }

    private AppUser lockParticipant(String email) {
        return requireParticipant(appUserRepository.findByEmailIgnoreCaseForUpdate(email)
                .orElseThrow(() -> new EntityNotFoundException("Authenticated user not found.")));
    }

    private static AppUser requireParticipant(AppUser participant) {
        return WorkforceParticipantPolicy.requireActiveParticipant(participant);
    }

    private AttendanceSessionResponse toAttendanceResponse(AttendanceSession session) {
        return new AttendanceSessionResponse(
                session.getAttendanceSessionId(), session.getWorker().getUserId(), session.getClockedInAt(),
                session.getClockedOutAt(), breakPeriodRepository
                .findByAttendanceSessionAttendanceSessionIdOrderByStartedAtAscBreakPeriodIdAsc(
                        session.getAttendanceSessionId())
                .stream().map(WorkforceAvailabilityService::toBreakResponse).toList());
    }

    private static BreakPeriodResponse toBreakResponse(BreakPeriod period) {
        return new BreakPeriodResponse(period.getBreakPeriodId(), period.getStartedAt(), period.getEndedAt());
    }

    private static AvailabilityOverrideResponse toOverrideResponse(AvailabilityOverride override) {
        return new AvailabilityOverrideResponse(
                override.getAvailabilityOverrideId(), override.getWorker().getUserId(), override.getStartsAt(),
                override.getEndsAt(), override.getReason(), override.getCreatedBy().getUserId(),
                override.getCreatedAt(), override.getClearedAt(),
                override.getClearedBy() == null ? null : override.getClearedBy().getUserId());
    }

    private static Instant after(Instant start) {
        Instant now = Instant.now();
        return now.isAfter(start) ? now : start.plusMillis(1);
    }
}
