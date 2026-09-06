package org.unibl.etf.efikas.repositories;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import org.unibl.etf.efikas.exceptions.DomainConflictException;
import jakarta.persistence.EntityNotFoundException;
import org.unibl.etf.efikas.models.entities.AppUser;
import org.unibl.etf.efikas.models.enums.UserRole;
import org.unibl.etf.efikas.models.enums.WorkerAvailabilityStatus;
import org.unibl.etf.efikas.models.requests.CreateAvailabilityOverrideRequest;
import org.unibl.etf.efikas.services.WorkforceAvailabilityService;
import org.unibl.etf.efikas.services.interfaces.S3Service;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class B10WorkforceAvailabilityIntegrationTest {
    @Autowired WorkforceAvailabilityService workforceService;
    @Autowired AppUserRepository appUserRepository;
    @Autowired JdbcTemplate jdbcTemplate;

    @MockitoBean S3Service s3Service;

    @Test
    void performsCompleteAttendanceBreakAndOverrideLifecycle() {
        AppUser worker = worker("lifecycle");

        assertThat(workforceService.current(worker.getEmail()).status())
                .isEqualTo(WorkerAvailabilityStatus.OFF_DUTY);
        assertThat(workforceService.clockIn(worker.getEmail()).status())
                .isEqualTo(WorkerAvailabilityStatus.AVAILABLE);
        assertThat(workforceService.startBreak(worker.getEmail()).status())
                .isEqualTo(WorkerAvailabilityStatus.ON_BREAK);
        assertThat(workforceService.endBreak(worker.getEmail()).status())
                .isEqualTo(WorkerAvailabilityStatus.AVAILABLE);

        var override = workforceService.createOverride(worker.getEmail(),
                new CreateAvailabilityOverrideRequest(null, Instant.now().plusSeconds(3600), "Medical appointment"));
        assertThat(workforceService.current(worker.getEmail()).status())
                .isEqualTo(WorkerAvailabilityStatus.UNAVAILABLE);
        assertThat(workforceService.clearOverride(worker.getEmail(), override.availabilityOverrideId()).clearedAt())
                .isNotNull();
        assertThat(workforceService.current(worker.getEmail()).status())
                .isEqualTo(WorkerAvailabilityStatus.AVAILABLE);
        assertThat(workforceService.clockOut(worker.getEmail()).status())
                .isEqualTo(WorkerAvailabilityStatus.OFF_DUTY);

        var sessions = workforceService.attendanceHistory(worker.getEmail(), PageRequest.of(0, 20));
        assertThat(sessions.content()).hasSize(1);
        assertThat(sessions.content().get(0).breaks()).hasSize(1);
        assertThat(sessions.content().get(0).clockedOutAt()).isNotNull();
        assertThat(workforceService.overrideHistory(worker.getEmail(), PageRequest.of(0, 20)).content())
                .singleElement().satisfies(entry -> assertThat(entry.reason()).isEqualTo("Medical appointment"));
    }

    @Test
    void rejectsInvalidTransitionsAndOverlappingOverrides() {
        AppUser worker = worker("invalid");

        assertThatThrownBy(() -> workforceService.startBreak(worker.getEmail()))
                .isInstanceOf(DomainConflictException.class).hasMessageContaining("not clocked in");
        workforceService.clockIn(worker.getEmail());
        assertThatThrownBy(() -> workforceService.clockIn(worker.getEmail()))
                .isInstanceOf(DomainConflictException.class).hasMessageContaining("already clocked in");
        workforceService.startBreak(worker.getEmail());
        assertThatThrownBy(() -> workforceService.clockOut(worker.getEmail()))
                .isInstanceOf(DomainConflictException.class).hasMessageContaining("End the current break");
        workforceService.endBreak(worker.getEmail());

        Instant future = Instant.now().plusSeconds(600);
        workforceService.createOverride(worker.getEmail(),
                new CreateAvailabilityOverrideRequest(future, future.plusSeconds(600), "Scheduled unavailable"));
        assertThatThrownBy(() -> workforceService.createOverride(worker.getEmail(),
                new CreateAvailabilityOverrideRequest(future.plusSeconds(60), future.plusSeconds(120), "Overlap")))
                .isInstanceOf(DomainConflictException.class).hasMessageContaining("overlapping");
    }

    @Test
    void agentUsesTheSameAttendanceOverrideAndHistorySelfService() {
        AppUser agent = user("agent-lifecycle", UserRole.AGENT);

        assertThat(workforceService.clockIn(agent.getEmail()).status())
                .isEqualTo(WorkerAvailabilityStatus.AVAILABLE);
        assertThat(workforceService.startBreak(agent.getEmail()).status())
                .isEqualTo(WorkerAvailabilityStatus.ON_BREAK);
        assertThat(workforceService.endBreak(agent.getEmail()).status())
                .isEqualTo(WorkerAvailabilityStatus.AVAILABLE);
        var override = workforceService.createOverride(agent.getEmail(),
                new CreateAvailabilityOverrideRequest(null, Instant.now().plusSeconds(3600), "Training"));
        assertThat(workforceService.current(agent.getEmail()).status())
                .isEqualTo(WorkerAvailabilityStatus.UNAVAILABLE);
        assertThat(workforceService.clearOverride(agent.getEmail(), override.availabilityOverrideId()).clearedAt())
                .isNotNull();
        assertThat(workforceService.clockOut(agent.getEmail()).status())
                .isEqualTo(WorkerAvailabilityStatus.OFF_DUTY);
        assertThat(workforceService.attendanceHistory(agent.getEmail(), PageRequest.of(0, 20)).content())
                .singleElement().satisfies(session -> assertThat(session.breaks()).hasSize(1));
    }

    @Test
    void managerOverviewContainsActiveWorkforceParticipantsAndSupportsRoleFilter() {
        AppUser worker = worker("overview");
        workforceService.clockIn(worker.getEmail());
        AppUser agent = user("overview-agent", UserRole.AGENT);
        appUserRepository.save(agent);

        assertThat(workforceService.currentParticipants(PageRequest.of(0, 100), null).content())
                .anySatisfy(entry -> {
                    assertThat(entry.workerId()).isEqualTo(worker.getUserId());
                    assertThat(entry.status()).isEqualTo(WorkerAvailabilityStatus.AVAILABLE);
                })
                .anySatisfy(entry -> {
                    assertThat(entry.workerId()).isEqualTo(agent.getUserId());
                    assertThat(entry.role()).isEqualTo(UserRole.AGENT);
                });
        assertThat(workforceService.currentParticipants(PageRequest.of(0, 100), UserRole.AGENT).content())
                .allSatisfy(entry -> assertThat(entry.role()).isEqualTo(UserRole.AGENT));
        assertThatThrownBy(() -> workforceService.currentParticipants(PageRequest.of(0, 20), UserRole.MANAGER))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void agentCannotClearAnotherParticipantsOverride() {
        AppUser agent = user("owner-agent", UserRole.AGENT);
        AppUser anotherAgent = user("other-agent", UserRole.AGENT);
        var override = workforceService.createOverride(agent.getEmail(),
                new CreateAvailabilityOverrideRequest(null, Instant.now().plusSeconds(3600), "Training"));

        assertThatThrownBy(() -> workforceService.clearOverride(anotherAgent.getEmail(),
                override.availabilityOverrideId()))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void databaseRetainsAttendanceHistory() {
        AppUser worker = worker("retention");
        Long sessionId = workforceService.clockIn(worker.getEmail()).attendanceSessionId();
        workforceService.clockOut(worker.getEmail());

        assertThatThrownBy(() -> jdbcTemplate.update(
                "delete from efikas.attendance_session where \"AttendanceSessionId\" = ?", sessionId))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("retained as history");
    }

    @Test
    void databasePreventsDeactivatingWorkerWithOpenAttendance() {
        AppUser worker = worker("deactivate");
        workforceService.clockIn(worker.getEmail());

        assertThatThrownBy(() -> jdbcTemplate.update(
                "update efikas.app_user set \"Active\" = false where \"UserId\" = ?", worker.getUserId()))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("Open attendance must be closed");
    }

    @Test
    void databaseAllowsAValidDirectAgentAttendanceInsert() {
        AppUser agent = user("direct-attendance-agent", UserRole.AGENT);

        Long sessionId = jdbcTemplate.queryForObject(
                "insert into efikas.attendance_session (\"WorkerId\") values (?) returning \"AttendanceSessionId\"",
                Long.class, agent.getUserId());

        assertThat(sessionId).isNotNull();
    }

    @Test
    void databaseAllowsAValidDirectAgentAvailabilityOverrideInsert() {
        AppUser agent = user("direct-override-agent", UserRole.AGENT);

        Long overrideId = jdbcTemplate.queryForObject("""
                insert into efikas.availability_override ("WorkerId", "StartsAt", "EndsAt", "Reason", "CreatedBy")
                values (?, current_timestamp, current_timestamp + interval '1 hour', ?, ?)
                returning "AvailabilityOverrideId"
                """, Long.class, agent.getUserId(), "Training", agent.getUserId());

        assertThat(overrideId).isNotNull();
    }

    @Test
    void databaseRejectsDirectManagerAttendanceInsert() {
        AppUser manager = user("direct-attendance-manager", UserRole.MANAGER);

        assertThatThrownBy(() -> jdbcTemplate.update(
                "insert into efikas.attendance_session (\"WorkerId\") values (?)", manager.getUserId()))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("active workforce participant");
    }

    @Test
    void databaseRejectsDirectInactiveAgentAttendanceInsert() {
        AppUser inactiveAgent = user("direct-attendance-inactive", UserRole.AGENT);
        inactiveAgent.setActive(false);
        appUserRepository.saveAndFlush(inactiveAgent);

        assertThatThrownBy(() -> jdbcTemplate.update(
                "insert into efikas.attendance_session (\"WorkerId\") values (?)", inactiveAgent.getUserId()))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("active workforce participant");
    }

    @Test
    void databasePreventsDeactivatingAgentWithOpenAttendance() {
        AppUser agent = user("deactivate-agent", UserRole.AGENT);
        workforceService.clockIn(agent.getEmail());

        assertThatThrownBy(() -> jdbcTemplate.update(
                "update efikas.app_user set \"Active\" = false where \"UserId\" = ?", agent.getUserId()))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("Open attendance must be closed");
    }

    @Test
    void databasePreventsAgentWorkerRoleChangeWithOpenAttendance() {
        AppUser agent = user("role-change-agent", UserRole.AGENT);
        workforceService.clockIn(agent.getEmail());

        assertThatThrownBy(() -> jdbcTemplate.update(
                "update efikas.app_user set \"Role\" = 'OPERATIONAL_WORKER' where \"UserId\" = ?",
                agent.getUserId()))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("Open attendance must be closed");
    }

    @Test
    void databasePreventsWorkerAgentRoleChangeWithOpenAttendance() {
        AppUser worker = worker("role-change-worker");
        workforceService.clockIn(worker.getEmail());

        assertThatThrownBy(() -> jdbcTemplate.update(
                "update efikas.app_user set \"Role\" = 'AGENT' where \"UserId\" = ?", worker.getUserId()))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("Open attendance must be closed");
    }

    private AppUser worker(String label) {
        return user(label, UserRole.OPERATIONAL_WORKER);
    }

    private AppUser user(String label, UserRole role) {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        AppUser user = new AppUser();
        user.setName("B10");
        user.setSurname(label);
        user.setJmbg(String.format("%013d", Integer.toUnsignedLong(suffix.hashCode()) % 10_000_000_000_000L));
        user.setPasswordHash("not-a-real-password-hash");
        user.setEmail("b10-" + suffix + "@example.invalid");
        user.setRole(role);
        user.setAddress("Workforce integration address");
        user.setActive(true);
        return appUserRepository.saveAndFlush(user);
    }
}
