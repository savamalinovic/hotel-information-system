package org.unibl.etf.efikas.repositories;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.unibl.etf.efikas.models.entities.*;
import org.unibl.etf.efikas.models.enums.*;
import org.unibl.etf.efikas.models.requests.*;
import org.unibl.etf.efikas.services.*;
import org.unibl.etf.efikas.services.interfaces.NotificationService;
import org.unibl.etf.efikas.services.interfaces.S3Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class B17TaskNotificationIntegrationTest {
    @Autowired TaskService taskService;
    @Autowired CheckOutService checkOutService;
    @Autowired CheckInService checkInService;
    @Autowired GuestService guestService;
    @Autowired ReservationService reservationService;
    @Autowired ApartmentService apartmentService;
    @Autowired ApartmentTypeService apartmentTypeService;
    @Autowired AppUserRepository users;
    @Autowired SpecializationRepository specializations;
    @Autowired NotificationRepository notifications;
    @Autowired NotificationService notificationService;
    @Autowired JdbcTemplate jdbc;
    @MockitoBean S3Service storage;

    @Test
    void manualTaskNotifiesOnlyActiveWorkersWithTheMatchingSpecializationAndExposesTaskId() {
        String suffix = suffix();
        Specialization electrical = specialization("ELECTRICAL");
        Specialization inspection = specialization("INSPECTION");
        AppUser agent = save("agent-" + suffix, UserRole.AGENT, true);
        AppUser manager = save("manager-" + suffix, UserRole.MANAGER, true);
        AppUser eligibleButOffDuty = save("eligible-off-duty-" + suffix, UserRole.OPERATIONAL_WORKER, true, electrical);
        AppUser eligible = save("eligible-" + suffix, UserRole.OPERATIONAL_WORKER, true, electrical);
        AppUser wrongSpecialization = save("wrong-" + suffix, UserRole.OPERATIONAL_WORKER, true, inspection);
        AppUser inactive = save("inactive-" + suffix, UserRole.OPERATIONAL_WORKER, false, electrical);

        var task = taskService.create(agent.getEmail(), new CreateTaskRequest(
                electrical.getSpecializationId(), null, null, "Popraviti lampu", "Provjeriti rasvjetu", TaskPriority.HIGH));

        List<Notification> created = notifications.findByTaskTaskId(task.taskId());
        assertThat(created).hasSize(2).allSatisfy(notification -> {
            assertThat(notification.getType()).isEqualTo(TaskNotificationService.TASK_AVAILABLE);
            assertThat(notification.getTask().getTaskId()).isEqualTo(task.taskId());
            assertThat(notification.getReadAt()).isNull();
        });
        assertThat(created).extracting(notification -> notification.getRecipient().getUserId())
                .containsExactlyInAnyOrder(eligibleButOffDuty.getUserId(), eligible.getUserId())
                .doesNotContain(agent.getUserId(), manager.getUserId(), wrongSpecialization.getUserId(), inactive.getUserId());
        assertThat(notificationService.list(eligibleButOffDuty.getEmail(), false, PageRequest.of(0, 20)).content())
                .anySatisfy(response -> {
                    assertThat(response.type()).isEqualTo(TaskNotificationService.TASK_AVAILABLE);
                    assertThat(response.taskId()).isEqualTo(task.taskId());
                });

        Notification legacy = new Notification();
        legacy.setRecipient(eligible); legacy.setType("LEAVE_APPROVED");
        legacy.setTitle("Odsustvo"); legacy.setBody("Zahtjev je odobren.");
        legacy = notifications.saveAndFlush(legacy);
        Long legacyId = legacy.getNotificationId();
        assertThat(notificationService.list(eligible.getEmail(), false, PageRequest.of(0, 20)).content())
                .anySatisfy(response -> {
                    assertThat(response.notificationId()).isEqualTo(legacyId);
                    assertThat(response.taskId()).isNull();
                });

        var taskWithoutRecipients = taskService.create(agent.getEmail(), new CreateTaskRequest(
                specialization("PLUMBING").getSpecializationId(), null, null,
                "Provjeriti cijev", "Nema kvalifikovanih radnika", TaskPriority.NORMAL));
        assertThat(notifications.findByTaskTaskId(taskWithoutRecipients.taskId())).isEmpty();
    }

    @Test
    void checkoutCleaningTaskNotifiesCleaningWorkersOnlyOnceAcrossIdempotentRetries() {
        String suffix = suffix();
        Specialization cleaning = specialization("CLEANING");
        AppUser manager = save("manager-" + suffix, UserRole.MANAGER, true);
        AppUser agent = save("agent-" + suffix, UserRole.AGENT, true);
        AppUser cleaner = save("cleaner-" + suffix, UserRole.OPERATIONAL_WORKER, true, cleaning);

        Integer reservationId = checkedInReservation(suffix, manager, agent);
        var first = checkOutService.checkOut(reservationId, agent.getEmail());
        var repeated = checkOutService.checkOut(reservationId, agent.getEmail());

        assertThat(repeated.cleaningTaskId()).isEqualTo(first.cleaningTaskId());
        assertThat(notifications.findByTaskTaskId(first.cleaningTaskId())).singleElement().satisfies(notification -> {
            assertThat(notification.getRecipient().getUserId()).isEqualTo(cleaner.getUserId());
            assertThat(notification.getType()).isEqualTo(TaskNotificationService.TASK_AVAILABLE);
            assertThat(notification.getTask().getSpecialization().getCode()).isEqualTo("CLEANING");
        });
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void databaseRejectsDuplicateTaskNotificationForTheSameRecipientAndType() {
        String suffix = suffix();
        Specialization electrical = specialization("ELECTRICAL");
        AppUser agent = save("agent-" + suffix, UserRole.AGENT, true);
        AppUser worker = save("worker-" + suffix, UserRole.OPERATIONAL_WORKER, true, electrical);
        var task = taskService.create(agent.getEmail(), new CreateTaskRequest(
                electrical.getSpecializationId(), null, null, "Provjeriti osigurac", "Provjera", TaskPriority.NORMAL));

        assertThat(notifications.findByTaskTaskId(task.taskId())).singleElement();
        assertThatThrownBy(() -> jdbc.update("""
                        insert into efikas."notification" ("RecipientId", "TaskId", "Type", "Title", "Body")
                        values (?, ?, ?, ?, ?)
                        """, worker.getUserId(), task.taskId(), TaskNotificationService.TASK_AVAILABLE,
                "Duplikat", "Ovo mora biti odbijeno."))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private Integer checkedInReservation(String suffix, AppUser manager, AppUser agent) {
        var type = apartmentTypeService.create(new ApartmentTypeRequest(
                "B17 Type " + suffix, null, 2, new BigDecimal("120.00")));
        var apartment = apartmentService.create(new ApartmentRequest(
                "B17 Apt " + suffix, "B17 address", 1, type.apartmentTypeId()), manager.getEmail());
        Integer reservationId = reservationService.create(new CreateReservationRequest(
                apartment.apartmentId(), LocalDate.now(), LocalDate.now().plusDays(3),
                1, null, null), agent.getEmail()).reservationId();
        guestService.addToReservation(reservationId,
                new AddReservationGuestRequest(null, guest("guest-" + suffix), true), agent.getEmail());
        checkInService.checkIn(reservationId, agent.getEmail());
        return reservationId;
    }

    private Specialization specialization(String code) {
        return specializations.findByCode(code).orElseThrow();
    }

    private AppUser save(String label, UserRole role, boolean active, Specialization... assignedSpecializations) {
        AppUser user = new AppUser();
        user.setName("B17"); user.setSurname(label);
        user.setJmbg(String.format("%013d", Integer.toUnsignedLong(label.hashCode()) % 10_000_000_000_000L));
        user.setPasswordHash("hash"); user.setEmail("b17-" + label + "@example.invalid");
        user.setRole(role); user.setAddress("B17 address"); user.setActive(active);
        user = users.saveAndFlush(user);
        for (Specialization specialization : assignedSpecializations) user.getSpecializations().add(specialization);
        return users.saveAndFlush(user);
    }

    private static GuestRequest guest(String citizenId) {
        return new GuestRequest(citizenId, true, null, "B17", "Guest", Gender.Female, null,
                LocalDate.of(1990, 1, 1), "Banja Luka", "Banja Luka", "Bosnia and Herzegovina",
                "Guest address", null, null, null, null, null, null, null, null);
    }

    private static String suffix() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    }
}
