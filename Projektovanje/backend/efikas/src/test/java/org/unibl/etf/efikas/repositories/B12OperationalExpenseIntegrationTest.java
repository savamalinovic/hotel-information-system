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
import org.unibl.etf.efikas.models.enums.UserRole;
import org.unibl.etf.efikas.models.requests.CreateExpenseCategoryRequest;
import org.unibl.etf.efikas.models.requests.CreateOperationalExpenseRequest;
import org.unibl.etf.efikas.models.requests.UpdateExpenseCategoryRequest;
import org.unibl.etf.efikas.services.OperationalExpenseService;
import org.unibl.etf.efikas.services.interfaces.S3Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class B12OperationalExpenseIntegrationTest {
    @Autowired OperationalExpenseService expenseService;
    @Autowired AppUserRepository appUserRepository;
    @Autowired JdbcTemplate jdbcTemplate;

    @MockitoBean S3Service s3Service;

    @Test
    void managerMaintainsCategoriesAndAgentRecordsHotelExpense() {
        AppUser manager = user("manager-flow", UserRole.MANAGER);
        AppUser agent = user("agent-flow", UserRole.AGENT);
        var category = expenseService.createCategory(manager.getEmail(),
                new CreateExpenseCategoryRequest("Supplies", "Consumable hotel supplies"));

        var expense = expenseService.createExpense(agent.getEmail(), new CreateOperationalExpenseRequest(
                category.expenseCategoryId(), "Cleaning products", "Monthly restock",
                new BigDecimal("145.60"), LocalDate.now()));

        assertThat(expense.amount()).isEqualByComparingTo("145.60");
        assertThat(expense.categoryName()).isEqualTo("Supplies");
        assertThat(expense.createdBy()).isEqualTo(agent.getUserId());
        assertThat(expense.voided()).isFalse();
        assertThat(expenseService.expenses(LocalDate.now(), LocalDate.now(), category.expenseCategoryId(),
                agent.getUserId(), false, PageRequest.of(0, 20)).content())
                .singleElement().satisfies(row -> assertThat(row.operationalExpenseId())
                        .isEqualTo(expense.operationalExpenseId()));
    }

    @Test
    void managerVoidsExpenseIdempotentlyWithoutDeletingHistory() {
        AppUser manager = user("manager-void", UserRole.MANAGER);
        AppUser agent = user("agent-void", UserRole.AGENT);
        var category = expenseService.createCategory(manager.getEmail(),
                new CreateExpenseCategoryRequest("Utilities", null));
        var expense = expenseService.createExpense(agent.getEmail(), new CreateOperationalExpenseRequest(
                category.expenseCategoryId(), "Water delivery", null,
                new BigDecimal("80.00"), LocalDate.now()));

        var voided = expenseService.voidExpense(manager.getEmail(), expense.operationalExpenseId(), "Duplicate entry");
        var repeated = expenseService.voidExpense(manager.getEmail(), expense.operationalExpenseId(), "Ignored");

        assertThat(voided.voided()).isTrue();
        assertThat(voided.voidedBy()).isEqualTo(manager.getUserId());
        assertThat(repeated.voidedAt()).isEqualTo(voided.voidedAt());
        assertThat(repeated.voidReason()).isEqualTo("Duplicate entry");
    }

    @Test
    void rejectsInactiveCategoryFutureDateAndDuplicateCategoryName() {
        AppUser manager = user("manager-rules", UserRole.MANAGER);
        AppUser agent = user("agent-rules", UserRole.AGENT);
        var category = expenseService.createCategory(manager.getEmail(),
                new CreateExpenseCategoryRequest("Maintenance", null));

        assertThatThrownBy(() -> expenseService.createCategory(manager.getEmail(),
                new CreateExpenseCategoryRequest(" maintenance ", "Duplicate")))
                .isInstanceOf(DomainConflictException.class).hasMessageContaining("already exists");
        expenseService.updateCategory(manager.getEmail(), category.expenseCategoryId(),
                new UpdateExpenseCategoryRequest("Maintenance", "Inactive", false));
        assertThatThrownBy(() -> expenseService.createExpense(agent.getEmail(), new CreateOperationalExpenseRequest(
                category.expenseCategoryId(), "Repair", null, new BigDecimal("10.00"), LocalDate.now())))
                .isInstanceOf(DomainConflictException.class).hasMessageContaining("active category");
        assertThatThrownBy(() -> expenseService.createExpense(agent.getEmail(), new CreateOperationalExpenseRequest(
                category.expenseCategoryId(), "Future", null, new BigDecimal("10.00"), LocalDate.now().plusDays(1))))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("future");
    }

    @Test
    void databaseRejectsExpenseMutationAndDeletion() {
        AppUser manager = user("manager-db", UserRole.MANAGER);
        var category = expenseService.createCategory(manager.getEmail(),
                new CreateExpenseCategoryRequest("Insurance", null));
        var expense = expenseService.createExpense(manager.getEmail(), new CreateOperationalExpenseRequest(
                category.expenseCategoryId(), "Policy", null, new BigDecimal("500.00"), LocalDate.now()));

        assertThatThrownBy(() -> jdbcTemplate.update(
                "update efikas.operational_expense set \"Amount\" = 1 where \"OperationalExpenseId\" = ?",
                expense.operationalExpenseId()))
                .isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining("immutable");
    }

    @Test
    void databaseRejectsCategoryDeletion() {
        AppUser manager = user("manager-delete", UserRole.MANAGER);
        var category = expenseService.createCategory(manager.getEmail(),
                new CreateExpenseCategoryRequest("Licenses", null));

        assertThatThrownBy(() -> jdbcTemplate.update(
                "delete from efikas.expense_category where \"ExpenseCategoryId\" = ?",
                category.expenseCategoryId()))
                .isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining("cannot be deleted");
    }

    @Test
    void databaseRejectsExpenseDeletion() {
        AppUser manager = user("manager-expdel", UserRole.MANAGER);
        var category = expenseService.createCategory(manager.getEmail(),
                new CreateExpenseCategoryRequest("Subscriptions", null));
        var expense = expenseService.createExpense(manager.getEmail(), new CreateOperationalExpenseRequest(
                category.expenseCategoryId(), "Software", null, new BigDecimal("35.00"), LocalDate.now()));

        assertThatThrownBy(() -> jdbcTemplate.update(
                "delete from efikas.operational_expense where \"OperationalExpenseId\" = ?",
                expense.operationalExpenseId()))
                .isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining("cannot be deleted");
    }

    private AppUser user(String label, UserRole role) {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        AppUser user = new AppUser();
        user.setName("B12");
        user.setSurname(label);
        user.setJmbg(String.format("%013d", Integer.toUnsignedLong(suffix.hashCode()) % 10_000_000_000_000L));
        user.setPasswordHash("not-a-real-password-hash");
        user.setEmail("b12-" + label + "-" + suffix + "@example.invalid");
        user.setRole(role);
        user.setAddress("Expense integration address");
        user.setActive(true);
        return appUserRepository.save(user);
    }
}
