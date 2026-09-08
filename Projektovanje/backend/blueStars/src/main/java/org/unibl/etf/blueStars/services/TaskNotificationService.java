package org.unibl.etf.blueStars.services;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.unibl.etf.blueStars.models.entities.OperationalTask;
import org.unibl.etf.blueStars.models.enums.UserRole;
import org.unibl.etf.blueStars.repositories.AppUserRepository;
import org.unibl.etf.blueStars.services.interfaces.NotificationService;

@Service
@RequiredArgsConstructor
public class TaskNotificationService {
    public static final String TASK_AVAILABLE = "TASK_AVAILABLE";

    private final AppUserRepository users;
    private final NotificationService notifications;

    @Transactional
    public void notifyEligibleWorkers(OperationalTask task) {
        var recipients = users.findActiveByRoleAndSpecializationId(
                UserRole.OPERATIONAL_WORKER, task.getSpecialization().getSpecializationId());
        notifications.notify(recipients, TASK_AVAILABLE, "Novi zadatak je dostupan", message(task), task);
    }

    private static String message(OperationalTask task) {
        String apartment = task.getApartment() == null ? "" : " — apartman " + task.getApartment().getName();
        return task.getTitle() + " — " + task.getSpecialization().getName() + apartment;
    }
}
