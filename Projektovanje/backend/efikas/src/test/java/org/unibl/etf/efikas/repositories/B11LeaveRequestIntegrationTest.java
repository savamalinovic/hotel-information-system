package org.unibl.etf.efikas.repositories;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import org.unibl.etf.efikas.exceptions.DomainConflictException;
import org.unibl.etf.efikas.models.entities.AppUser;
import org.unibl.etf.efikas.models.enums.LeaveRequestStatus;
import org.unibl.etf.efikas.models.enums.UserRole;
import org.unibl.etf.efikas.models.enums.WorkerAvailabilityStatus;
import org.unibl.etf.efikas.models.requests.CreateLeaveRequest;
import org.unibl.etf.efikas.services.LeaveRequestService;
import org.unibl.etf.efikas.services.WorkforceAvailabilityService;
import org.unibl.etf.efikas.services.interfaces.S3Service;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class B11LeaveRequestIntegrationTest {
    @Autowired LeaveRequestService leaveService;
    @Autowired WorkforceAvailabilityService workforceService;
    @Autowired AppUserRepository appUserRepository;
    @Autowired JdbcTemplate jdbcTemplate;

    @MockitoBean S3Service s3Service;

    @Test
    void completesApprovalAvailabilityAndCancellationLifecycle() {
        AppUser worker = user("worker-approval", UserRole.OPERATIONAL_WORKER);
        AppUser manager = user("manager-approval", UserRole.MANAGER);
        workforceService.clockIn(worker.getEmail());
        Instant now = Instant.now();

        var created = leaveService.create(worker.getEmail(),
                new CreateLeaveRequest(now.minusSeconds(60), now.plusSeconds(3600), "Annual leave"));
        assertThat(created.status()).isEqualTo(LeaveRequestStatus.PENDING);

        var approved = leaveService.approve(manager.getEmail(), created.leaveRequestId());
        assertThat(approved.status()).isEqualTo(LeaveRequestStatus.APPROVED);
        assertThat(approved.decidedBy()).isEqualTo(manager.getUserId());
        assertThat(workforceService.current(worker.getEmail()))
                .satisfies(availability -> {
                    assertThat(availability.status()).isEqualTo(WorkerAvailabilityStatus.ON_LEAVE);
                    assertThat(availability.leaveRequestId()).isEqualTo(created.leaveRequestId());
                    assertThat(availability.leaveReason()).isEqualTo("Annual leave");
                });
        assertThatThrownBy(() -> workforceService.assertAvailableForTask(worker))
                .isInstanceOf(DomainConflictException.class).hasMessageContaining("present and available");

        var cancelled = leaveService.cancel(worker.getEmail(), created.leaveRequestId());
        assertThat(cancelled.status()).isEqualTo(LeaveRequestStatus.CANCELLED);
        assertThat(cancelled.cancelledBy()).isEqualTo(worker.getUserId());
        assertThat(workforceService.current(worker.getEmail()).status())
                .isEqualTo(WorkerAvailabilityStatus.AVAILABLE);
        assertThat(leaveService.cancel(worker.getEmail(), created.leaveRequestId()).cancelledAt())
                .isEqualTo(cancelled.cancelledAt());
    }

    @Test
    void rejectsRequestWithReasonAndRetainsDecisionActors() {
        AppUser worker = user("worker-reject", UserRole.OPERATIONAL_WORKER);
        AppUser manager = user("manager-reject", UserRole.MANAGER);
        Instant start = Instant.now().plusSeconds(3600);
        var created = leaveService.create(worker.getEmail(),
                new CreateLeaveRequest(start, start.plusSeconds(3600), "Personal reason"));

        var rejected = leaveService.reject(manager.getEmail(), created.leaveRequestId(), "Coverage unavailable");

        assertThat(rejected.status()).isEqualTo(LeaveRequestStatus.REJECTED);
        assertThat(rejected.decisionReason()).isEqualTo("Coverage unavailable");
        assertThat(rejected.decidedBy()).isEqualTo(manager.getUserId());
        assertThatThrownBy(() -> leaveService.cancel(worker.getEmail(), created.leaveRequestId()))
                .isInstanceOf(DomainConflictException.class).hasMessageContaining("pending or approved");
    }

    @Test
    void preventsOverlapsAndInvalidRepeatedDecisions() {
        AppUser worker = user("worker-overlap", UserRole.OPERATIONAL_WORKER);
        AppUser manager = user("manager-overlap", UserRole.MANAGER);
        Instant start = Instant.now().plusSeconds(3600);
        var first = leaveService.create(worker.getEmail(),
                new CreateLeaveRequest(start, start.plusSeconds(7200), "Vacation"));

        assertThatThrownBy(() -> leaveService.create(worker.getEmail(),
                new CreateLeaveRequest(start.plusSeconds(60), start.plusSeconds(120), "Overlap")))
                .isInstanceOf(DomainConflictException.class).hasMessageContaining("overlapping");
        leaveService.approve(manager.getEmail(), first.leaveRequestId());
        assertThatThrownBy(() -> leaveService.reject(manager.getEmail(), first.leaveRequestId(), "Changed mind"))
                .isInstanceOf(DomainConflictException.class).hasMessageContaining("pending");
    }

    @Test
    void managerCanFilterQueueAndDatabaseRetainsHistory() {
        AppUser worker = user("worker-list", UserRole.OPERATIONAL_WORKER);
        Instant start = Instant.now().plusSeconds(3600);
        var created = leaveService.create(worker.getEmail(),
                new CreateLeaveRequest(start, start.plusSeconds(3600), "Training"));

        assertThat(leaveService.list(worker.getUserId(), LeaveRequestStatus.PENDING,
                PageRequest.of(0, 20)).content()).singleElement()
                .satisfies(request -> assertThat(request.leaveRequestId()).isEqualTo(created.leaveRequestId()));
        assertThatThrownBy(() -> jdbcTemplate.update(
                "delete from efikas.leave_request where \"LeaveRequestId\" = ?", created.leaveRequestId()))
                .isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining("retained as history");
    }

    private AppUser user(String label, UserRole role) {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        AppUser user = new AppUser();
        user.setName("B11");
        user.setSurname(label);
        user.setJmbg(String.format("%013d", Integer.toUnsignedLong(suffix.hashCode()) % 10_000_000_000_000L));
        user.setPasswordHash("not-a-real-password-hash");
        user.setEmail("b11-" + label + "-" + suffix + "@example.invalid");
        user.setRole(role);
        user.setAddress("Leave integration address");
        user.setActive(true);
        return appUserRepository.save(user);
    }
}
