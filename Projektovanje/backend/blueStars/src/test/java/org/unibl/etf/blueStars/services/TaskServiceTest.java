package org.unibl.etf.blueStars.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.unibl.etf.blueStars.models.entities.AppUser;
import org.unibl.etf.blueStars.models.entities.OperationalTask;
import org.unibl.etf.blueStars.models.entities.Specialization;
import org.unibl.etf.blueStars.models.enums.TaskPriority;
import org.unibl.etf.blueStars.models.enums.TaskStatus;
import org.unibl.etf.blueStars.models.enums.UserRole;
import org.unibl.etf.blueStars.models.responses.PageResponse;
import org.unibl.etf.blueStars.models.responses.TaskResponse;
import org.unibl.etf.blueStars.repositories.*;
import org.unibl.etf.blueStars.services.interfaces.S3Service;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {
    @Mock private OperationalTaskRepository tasks;
    @Mock private TaskStatusHistoryRepository history;
    @Mock private TaskAttachmentRepository attachments;
    @Mock private AppUserRepository users;
    @Mock private SpecializationRepository specializations;
    @Mock private ApartmentRepository apartments;
    @Mock private ReservationRepository reservations;
    @Mock private ApartmentStatusHistoryRepository apartmentHistory;
    @Mock private WorkforceAvailabilityService workforce;
    @Mock private S3Service storage;
    @Mock private AuditLogService auditLogService;
    @Mock private TaskNotificationService taskNotifications;

    private TaskService service;

    @BeforeEach
    void setUp() {
        service = new TaskService(tasks, history, attachments, users, specializations, apartments, reservations,
                apartmentHistory, workforce, storage, auditLogService, taskNotifications);
    }

    @Test
    void mineUsesTheAuthenticatedWorkerAndDoesNotNeedAClientSuppliedWorkerId() {
        AppUser worker = worker(41);
        OperationalTask task = task(11L, worker, TaskStatus.COMPLETED);
        Pageable pageable = PageRequest.of(0, 20);
        when(users.findByEmailIgnoreCase("worker@example.invalid")).thenReturn(Optional.of(worker));
        when(tasks.findByAssignedWorkerUserId(worker.getUserId(), pageable))
                .thenReturn(new PageImpl<>(java.util.List.of(task), pageable, 1));

        PageResponse<TaskResponse> result = service.mine("worker@example.invalid", null, pageable);

        assertThat(result.content()).extracting(TaskResponse::taskId).containsExactly(11L);
        verify(tasks).findByAssignedWorkerUserId(41, pageable);
        verify(tasks, never()).findByAssignedWorkerUserIdAndStatus(anyInt(), any(), any());
    }

    @Test
    void minePassesAnOptionalStatusFilterToTheWorkerScopedQuery() {
        AppUser worker = worker(52);
        OperationalTask task = task(12L, worker, TaskStatus.BLOCKED);
        Pageable pageable = PageRequest.of(1, 5);
        when(users.findByEmailIgnoreCase("worker@example.invalid")).thenReturn(Optional.of(worker));
        when(tasks.findByAssignedWorkerUserIdAndStatus(52, TaskStatus.BLOCKED, pageable))
                .thenReturn(new PageImpl<>(java.util.List.of(task), pageable, 6));

        PageResponse<TaskResponse> result = service.mine("worker@example.invalid", TaskStatus.BLOCKED, pageable);

        assertThat(result.totalElements()).isEqualTo(6);
        assertThat(result.content()).extracting(TaskResponse::status).containsExactly(TaskStatus.BLOCKED);
        verify(tasks).findByAssignedWorkerUserIdAndStatus(52, TaskStatus.BLOCKED, pageable);
    }

    private static AppUser worker(int id) {
        AppUser worker = new AppUser();
        worker.setUserId(id);
        worker.setActive(true);
        worker.setRole(UserRole.OPERATIONAL_WORKER);
        return worker;
    }

    private static OperationalTask task(Long id, AppUser worker, TaskStatus status) {
        Specialization specialization = new Specialization();
        specialization.setSpecializationId((short) 1);
        specialization.setCode("GENERAL_MAINTENANCE");
        OperationalTask task = new OperationalTask();
        task.setTaskId(id);
        task.setAssignedWorker(worker);
        task.setSpecialization(specialization);
        task.setTitle("Inspect equipment");
        task.setDescription("Inspect equipment in the boiler room.");
        task.setPriority(TaskPriority.NORMAL);
        task.setStatus(status);
        task.setCreatedAt(Instant.parse("2026-08-21T08:00:00Z"));
        task.setUpdatedAt(Instant.parse("2026-08-21T09:00:00Z"));
        return task;
    }
}
