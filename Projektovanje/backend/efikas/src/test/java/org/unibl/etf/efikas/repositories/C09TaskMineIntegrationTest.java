package org.unibl.etf.efikas.repositories;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import org.unibl.etf.efikas.models.entities.AppUser;
import org.unibl.etf.efikas.models.entities.Specialization;
import org.unibl.etf.efikas.models.enums.TaskPriority;
import org.unibl.etf.efikas.models.enums.TaskStatus;
import org.unibl.etf.efikas.models.enums.UserRole;
import org.unibl.etf.efikas.models.requests.CreateTaskRequest;
import org.unibl.etf.efikas.models.responses.TaskResponse;
import org.unibl.etf.efikas.services.TaskService;
import org.unibl.etf.efikas.services.WorkforceAvailabilityService;
import org.unibl.etf.efikas.services.interfaces.S3Service;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class C09TaskMineIntegrationTest {
    @Autowired private TaskService taskService;
    @Autowired private WorkforceAvailabilityService workforce;
    @Autowired private AppUserRepository users;
    @Autowired private SpecializationRepository specializations;
    @MockitoBean private S3Service storage;

    @Test
    void workerFindsOwnAssignedAndInProgressTasks() {
        Fixture assigned = fixture("assigned");
        Long assignedTask = create(assigned).taskId();
        taskService.claim(assigned.worker().getEmail(), assignedTask);

        assertThat(taskService.mine(assigned.worker().getEmail(), null, page()).content())
                .extracting(TaskResponse::taskId).containsExactly(assignedTask);
        assertThat(taskService.mine(assigned.worker().getEmail(), TaskStatus.ASSIGNED, page()).content())
                .extracting(TaskResponse::status).containsExactly(TaskStatus.ASSIGNED);

        Fixture inProgress = fixture("in-progress");
        Long inProgressTask = create(inProgress).taskId();
        taskService.claim(inProgress.worker().getEmail(), inProgressTask);
        taskService.start(inProgress.worker().getEmail(), inProgressTask);

        assertThat(taskService.mine(inProgress.worker().getEmail(), TaskStatus.IN_PROGRESS, page()).content())
                .extracting(TaskResponse::taskId).containsExactly(inProgressTask);
    }

    @Test
    void workerFindsBlockedAndCompletedHistoryButNotNewOrAnotherWorkersTask() {
        Fixture own = fixture("history");
        Long completedTask = create(own).taskId();
        complete(own.worker().getEmail(), completedTask);

        Long blockedTask = create(own).taskId();
        taskService.claim(own.worker().getEmail(), blockedTask);
        taskService.start(own.worker().getEmail(), blockedTask);
        taskService.block(own.worker().getEmail(), blockedTask, "Waiting for a part");

        Long newTask = create(own).taskId();
        Fixture other = fixture("other");
        Long otherTask = create(other).taskId();
        taskService.claim(other.worker().getEmail(), otherTask);

        var all = taskService.mine(own.worker().getEmail(), null, page());
        assertThat(all.content()).extracting(TaskResponse::taskId)
                .containsExactlyInAnyOrder(completedTask, blockedTask)
                .doesNotContain(newTask, otherTask);
        assertThat(taskService.mine(own.worker().getEmail(), TaskStatus.BLOCKED, page()).content())
                .extracting(TaskResponse::taskId).containsExactly(blockedTask);
        assertThat(taskService.mine(own.worker().getEmail(), TaskStatus.COMPLETED, page()).content())
                .extracting(TaskResponse::taskId).containsExactly(completedTask);
    }

    @Test
    void workerHistoryIsPaginatedAndNewestUpdatedTaskComesFirst() {
        Fixture fixture = fixture("pagination");
        Long first = create(fixture).taskId();
        complete(fixture.worker().getEmail(), first);
        Long second = create(fixture).taskId();
        complete(fixture.worker().getEmail(), second);

        var firstPage = taskService.mine(fixture.worker().getEmail(), null,
                PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, "updatedAt", "taskId")));
        var secondPage = taskService.mine(fixture.worker().getEmail(), null,
                PageRequest.of(1, 1, Sort.by(Sort.Direction.DESC, "updatedAt", "taskId")));

        assertThat(firstPage.totalElements()).isEqualTo(2);
        assertThat(firstPage.totalPages()).isEqualTo(2);
        assertThat(firstPage.content()).extracting(TaskResponse::taskId).containsExactly(second);
        assertThat(secondPage.content()).extracting(TaskResponse::taskId).containsExactly(first);
    }

    private TaskResponse create(Fixture fixture) {
        return taskService.create(fixture.manager().getEmail(), new CreateTaskRequest(
                fixture.specialization().getSpecializationId(), null, null, "Inspect equipment",
                "Inspect equipment in the boiler room.", TaskPriority.NORMAL));
    }

    private void complete(String workerEmail, Long taskId) {
        taskService.claim(workerEmail, taskId);
        taskService.start(workerEmail, taskId);
        taskService.complete(workerEmail, taskId);
    }

    private Fixture fixture(String label) {
        Specialization specialization = specializations.findAll().stream()
                .filter(candidate -> candidate.getCode().equals("GENERAL_MAINTENANCE"))
                .findFirst().orElseThrow();
        AppUser manager = save(label + "-manager", UserRole.MANAGER);
        AppUser worker = save(label + "-worker", UserRole.OPERATIONAL_WORKER);
        worker.getSpecializations().add(specialization);
        users.saveAndFlush(worker);
        workforce.clockIn(worker.getEmail());
        return new Fixture(manager, worker, specialization);
    }

    private AppUser save(String label, UserRole role) {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        AppUser user = new AppUser();
        user.setName("C09");
        user.setSurname(label);
        user.setJmbg(String.format("%013d", Integer.toUnsignedLong(suffix.hashCode()) % 10_000_000_000_000L));
        user.setPasswordHash("hash");
        user.setEmail("c09-" + label + "-" + suffix + "@example.invalid");
        user.setRole(role);
        user.setAddress("Task query test address");
        user.setActive(true);
        return users.saveAndFlush(user);
    }

    private static PageRequest page() {
        return PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "updatedAt", "taskId"));
    }

    private record Fixture(AppUser manager, AppUser worker, Specialization specialization) {
    }
}
