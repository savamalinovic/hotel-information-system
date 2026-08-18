package org.unibl.etf.efikas.services;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.unibl.etf.efikas.models.entities.AppUser;
import org.unibl.etf.efikas.models.entities.OperationalTask;
import org.unibl.etf.efikas.models.entities.Specialization;
import org.unibl.etf.efikas.models.enums.UserRole;
import org.unibl.etf.efikas.repositories.AppUserRepository;
import org.unibl.etf.efikas.services.interfaces.NotificationService;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.same;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TaskNotificationServiceTest {
    @Mock AppUserRepository users;
    @Mock NotificationService notifications;

    @Test
    void selectsOnlyActiveOperationalWorkersWithTheTaskSpecialization() {
        Specialization specialization = new Specialization();
        specialization.setSpecializationId((short) 3); specialization.setName("Elektrika");
        OperationalTask task = new OperationalTask(); task.setTaskId(456L);
        task.setSpecialization(specialization); task.setTitle("Popraviti lampu");
        AppUser worker = new AppUser(); worker.setUserId(7); worker.setActive(true);
        when(users.findActiveByRoleAndSpecializationId(UserRole.OPERATIONAL_WORKER, (short) 3))
                .thenReturn(List.of(worker));

        new TaskNotificationService(users, notifications).notifyEligibleWorkers(task);

        verify(users).findActiveByRoleAndSpecializationId(UserRole.OPERATIONAL_WORKER, (short) 3);
        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(notifications).notify(eq(List.of(worker)), eq(TaskNotificationService.TASK_AVAILABLE),
                eq("Novi zadatak je dostupan"), body.capture(), same(task));
        assertThat(body.getValue()).contains("Popraviti lampu", "Elektrika");
    }
}
