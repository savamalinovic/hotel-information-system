package org.unibl.etf.efikas.repositories;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import org.unibl.etf.efikas.models.entities.AppUser;
import org.unibl.etf.efikas.models.enums.TaskPriority;
import org.unibl.etf.efikas.models.enums.UserRole;
import org.unibl.etf.efikas.models.requests.*;
import org.unibl.etf.efikas.models.responses.FileUploadResponse;
import org.unibl.etf.efikas.services.*;
import org.unibl.etf.efikas.services.interfaces.S3Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.same;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SpringBootTest
@Transactional
class B13DamageIntegrationTest {
    @Autowired DamageService damageService;
    @Autowired ApartmentTypeService apartmentTypeService;
    @Autowired ApartmentService apartmentService;
    @Autowired TaskService taskService;
    @Autowired WorkforceAvailabilityService workforceService;
    @Autowired AppUserRepository appUserRepository;
    @Autowired SpecializationRepository specializationRepository;
    @Autowired JdbcTemplate jdbcTemplate;

    @MockitoBean S3Service storage;

    @Test
    void agentReportsAndManagerUpdatesDamageWithPreciseAmounts() {
        Fixture fixture = fixture("flow");
        var created = damageService.create(fixture.agent().getEmail(), fixture.apartmentId(),
                new CreateDamageRequest("Broken table", "Damaged table leg",
                        new BigDecimal("125.40"), null));

        var updated = damageService.update(fixture.manager().getEmail(), fixture.apartmentId(), created.damageId(),
                new UpdateDamageRequest("Broken table", "Replacement required",
                        new BigDecimal("125.40"), new BigDecimal("140.75")));

        assertThat(updated.estimatedAmount()).isEqualByComparingTo("125.40");
        assertThat(updated.confirmedAmount()).isEqualByComparingTo("140.75");
        assertThat(updated.createdBy()).isEqualTo(fixture.agent().getUserId());
        assertThat(updated.updatedBy()).isEqualTo(fixture.manager().getUserId());
        assertThat(damageService.list(fixture.agent().getEmail(), fixture.apartmentId(),
                PageRequest.of(0, 20)).content()).singleElement()
                .satisfies(damage -> assertThat(damage.damageId()).isEqualTo(created.damageId()));
    }

    @Test
    void workerWithRelevantTaskReadsAndAddsAttachment() throws Exception {
        Fixture fixture = fixture("worker");
        AppUser worker = user("worker", UserRole.OPERATIONAL_WORKER);
        var specialization = specializationRepository.findAll().stream()
                .filter(item -> item.getCode().equals("GENERAL_MAINTENANCE")).findFirst().orElseThrow();
        worker.getSpecializations().add(specialization);
        appUserRepository.saveAndFlush(worker);
        workforceService.clockIn(worker.getEmail());
        var task = taskService.create(fixture.agent().getEmail(), new CreateTaskRequest(
                specialization.getSpecializationId(), fixture.apartmentId(), null,
                "Inspect damage", "Document the damaged furniture", TaskPriority.NORMAL));
        taskService.claim(worker.getEmail(), task.taskId());
        var damage = damageService.create(fixture.agent().getEmail(), fixture.apartmentId(),
                new CreateDamageRequest("Chair", "Cracked chair", null, null));

        when(storage.uploadFile(eq("damage-attachments/"), any()))
                .thenReturn(new FileUploadResponse("damage-attachments/proof.jpg", LocalDateTime.now()));
        when(storage.getPresignedUrl("damage-attachments/proof.jpg"))
                .thenReturn("https://storage.invalid/damage-proof");
        var file = new MockMultipartFile("file", "proof.jpg", "image/jpeg", new byte[]{1, 2, 3});

        assertThat(damageService.get(worker.getEmail(), fixture.apartmentId(), damage.damageId()).damageId())
                .isEqualTo(damage.damageId());
        assertThat(damageService.attach(worker.getEmail(), fixture.apartmentId(), damage.damageId(), file)
                .downloadUrl()).isEqualTo("https://storage.invalid/damage-proof");
        verify(storage).uploadFile(eq("damage-attachments/"), same(file));
    }

    @Test
    void unrelatedWorkerCannotReadDamage() {
        Fixture fixture = fixture("scope");
        AppUser worker = user("unrelated", UserRole.OPERATIONAL_WORKER);
        var damage = damageService.create(fixture.agent().getEmail(), fixture.apartmentId(),
                new CreateDamageRequest("Window", "Cracked glass", null, null));

        assertThatThrownBy(() -> damageService.get(worker.getEmail(), fixture.apartmentId(), damage.damageId()))
                .isInstanceOf(AccessDeniedException.class).hasMessageContaining("not visible");
    }

    @Test
    void databaseRejectsUnauthorizedDamageUpdate() {
        Fixture fixture = fixture("db-update");
        var damage = damageService.create(fixture.agent().getEmail(), fixture.apartmentId(),
                new CreateDamageRequest("Lamp", "Broken lamp", null, null));

        assertThatThrownBy(() -> jdbcTemplate.update("""
                update efikas.damage_record set "Description" = ?, "UpdatedBy" = ?,
                    "UpdatedAt" = "UpdatedAt" + interval '1 second' where "DamageId" = ?
                """, "Changed by agent", fixture.agent().getUserId(), damage.damageId()))
                .isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining("active manager");
    }

    @Test
    void databaseRetainsDamageHistory() {
        Fixture fixture = fixture("db-delete");
        var damage = damageService.create(fixture.manager().getEmail(), fixture.apartmentId(),
                new CreateDamageRequest("Door", "Scratched door", null, null));

        assertThatThrownBy(() -> jdbcTemplate.update(
                "delete from efikas.damage_record where \"DamageId\" = ?", damage.damageId()))
                .isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining("retained as history");
    }

    private Fixture fixture(String label) {
        AppUser manager = user("m-" + label, UserRole.MANAGER);
        AppUser agent = user("a-" + label, UserRole.AGENT);
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        var type = apartmentTypeService.create(new ApartmentTypeRequest(
                "B13-" + suffix, "Damage test", 2, new BigDecimal("90.00")));
        var apartment = apartmentService.create(new ApartmentRequest(
                "B13-" + suffix, "Damage test address", null, type.apartmentTypeId()), manager.getEmail());
        return new Fixture(manager, agent, apartment.apartmentId());
    }

    private AppUser user(String label, UserRole role) {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        AppUser user = new AppUser();
        user.setName("B13");
        user.setSurname(label);
        user.setJmbg(String.format("%013d", Integer.toUnsignedLong(suffix.hashCode()) % 10_000_000_000_000L));
        user.setPasswordHash("not-a-real-password-hash");
        user.setEmail("b13-" + label + "-" + suffix + "@example.invalid");
        user.setRole(role);
        user.setAddress("Damage integration address");
        user.setActive(true);
        return appUserRepository.saveAndFlush(user);
    }

    private record Fixture(AppUser manager, AppUser agent, Integer apartmentId) {
    }
}
