package org.unibl.etf.blueStars.repositories;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.unibl.etf.blueStars.models.entities.AppUser;
import org.unibl.etf.blueStars.models.enums.AuditEvent;
import org.unibl.etf.blueStars.models.enums.UserRole;
import org.unibl.etf.blueStars.services.AuditLogService;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class B15AuditIntegrationTest {
    @Autowired AuditLogService auditLogService;
    @Autowired AppUserRepository appUserRepository;
    @Autowired JdbcTemplate jdbcTemplate;

    @Test
    void recordsCanBeFilteredByPeriodActorAndEvent() {
        AppUser actor = user();
        Instant before = Instant.now();
        auditLogService.record(AuditEvent.TASK_CREATED, actor, null, null, null, "First task.");
        auditLogService.record(AuditEvent.PAYMENT_RECORDED, actor, null, null, null, "Payment.");

        var page = auditLogService.find(actor.getEmail(), before, Instant.now().plusSeconds(1), actor.getUserId(),
                AuditEvent.TASK_CREATED, null, null, null, PageRequest.of(0, 20));

        assertThat(page.content()).singleElement().satisfies(item -> {
            assertThat(item.actorId()).isEqualTo(actor.getUserId());
            assertThat(item.event()).isEqualTo(AuditEvent.TASK_CREATED);
            assertThat(item.details()).isEqualTo("First task.");
        });
    }

    @Test
    void databaseRejectsAuditMutation() {
        AppUser actor = user();
        auditLogService.record(AuditEvent.TASK_CREATED, actor, null, null, null, "Immutable.");
        Long id = auditLogService.find(actor.getEmail(), null, null, actor.getUserId(), AuditEvent.TASK_CREATED,
                null, null, null, PageRequest.of(0, 20)).content().get(0).auditLogId();

        assertThatThrownBy(() -> jdbcTemplate.update(
                "update efikas.audit_log set \"Details\" = ? where \"AuditLogId\" = ?", "changed", id))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("append-only");
    }

    private AppUser user() {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        AppUser user = new AppUser();
        user.setName("Audit");
        user.setSurname("Tester");
        user.setJmbg(String.format("%013d", Integer.toUnsignedLong(suffix.hashCode()) % 10_000_000_000_000L));
        user.setPasswordHash("not-a-real-password-hash");
        user.setEmail("audit-" + suffix + "@example.invalid");
        user.setRole(UserRole.MANAGER);
        user.setAddress("Audit address");
        user.setActive(true);
        return appUserRepository.saveAndFlush(user);
    }
}
