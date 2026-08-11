package org.unibl.etf.efikas.repositories;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionTemplate;
import org.unibl.etf.efikas.exceptions.DomainConflictException;
import org.unibl.etf.efikas.models.entities.AppUser;
import org.unibl.etf.efikas.models.enums.UserRole;
import org.unibl.etf.efikas.services.WorkforceAvailabilityService;
import org.unibl.etf.efikas.services.interfaces.S3Service;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class B10AttendanceConcurrencyIntegrationTest {
    @Autowired TransactionTemplate transactionTemplate;
    @Autowired AppUserRepository appUserRepository;
    @Autowired AttendanceSessionRepository attendanceSessionRepository;
    @Autowired WorkforceAvailabilityService workforceService;

    @MockitoBean S3Service s3Service;

    @Test
    void onlyOneConcurrentClockInCreatesAnOpenSession() throws Exception {
        String email = transactionTemplate.execute(status -> worker().getEmail());
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        var executor = Executors.newFixedThreadPool(2);
        try {
            var first = executor.submit(() -> clockIn(email, ready, start));
            var second = executor.submit(() -> clockIn(email, ready, start));
            ready.await();
            start.countDown();

            assertThat(List.of(first.get(), second.get())).containsExactlyInAnyOrder(true, false);
            Integer workerId = appUserRepository.findByEmailIgnoreCase(email).orElseThrow().getUserId();
            assertThat(attendanceSessionRepository.existsByWorkerUserIdAndClockedOutAtIsNull(workerId)).isTrue();
        } finally {
            executor.shutdownNow();
        }
    }

    private boolean clockIn(String email, CountDownLatch ready, CountDownLatch start) {
        ready.countDown();
        try {
            start.await();
            workforceService.clockIn(email);
            return true;
        } catch (DomainConflictException ex) {
            return false;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Concurrent clock-in test was interrupted.", ex);
        }
    }

    private AppUser worker() {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        AppUser user = new AppUser();
        user.setName("B10");
        user.setSurname("Concurrent");
        user.setJmbg(String.format("%013d", Integer.toUnsignedLong(suffix.hashCode()) % 10_000_000_000_000L));
        user.setPasswordHash("not-a-real-password-hash");
        user.setEmail("b10-concurrent-" + suffix + "@example.invalid");
        user.setRole(UserRole.OPERATIONAL_WORKER);
        user.setAddress("Concurrency address");
        user.setActive(true);
        return appUserRepository.save(user);
    }
}
