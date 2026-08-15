package org.unibl.etf.efikas.services;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.unibl.etf.efikas.exceptions.DomainConflictException;
import org.unibl.etf.efikas.models.entities.AppUser;
import org.unibl.etf.efikas.models.entities.ExpenseCategory;
import org.unibl.etf.efikas.models.entities.OperationalExpense;
import org.unibl.etf.efikas.models.enums.UserRole;
import org.unibl.etf.efikas.models.enums.AuditEvent;
import org.unibl.etf.efikas.models.requests.CreateExpenseCategoryRequest;
import org.unibl.etf.efikas.models.requests.CreateOperationalExpenseRequest;
import org.unibl.etf.efikas.models.requests.UpdateExpenseCategoryRequest;
import org.unibl.etf.efikas.models.responses.ExpenseCategoryResponse;
import org.unibl.etf.efikas.models.responses.OperationalExpenseResponse;
import org.unibl.etf.efikas.models.responses.PageResponse;
import org.unibl.etf.efikas.repositories.AppUserRepository;
import org.unibl.etf.efikas.repositories.ExpenseCategoryRepository;
import org.unibl.etf.efikas.repositories.OperationalExpenseRepository;

import java.time.Instant;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class OperationalExpenseService {
    private final AppUserRepository appUserRepository;
    private final ExpenseCategoryRepository categoryRepository;
    private final OperationalExpenseRepository expenseRepository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public PageResponse<ExpenseCategoryResponse> categories(Boolean active, Pageable pageable) {
        return PageResponse.from((active == null ? categoryRepository.findAll(pageable)
                : categoryRepository.findByActive(active, pageable)).map(OperationalExpenseService::toCategory));
    }

    @Transactional
    public ExpenseCategoryResponse createCategory(String managerEmail, CreateExpenseCategoryRequest input) {
        AppUser manager = requireRole(managerEmail, UserRole.MANAGER);
        String name = input.name().trim();
        if (categoryRepository.existsByNameIgnoreCase(name)) {
            throw new DomainConflictException("An expense category with this name already exists.");
        }
        Instant now = Instant.now();
        ExpenseCategory category = new ExpenseCategory();
        category.setName(name);
        category.setDescription(trimToNull(input.description()));
        category.setActive(true);
        category.setCreatedBy(manager);
        category.setCreatedAt(now);
        category.setUpdatedBy(manager);
        category.setUpdatedAt(now);
        ExpenseCategory saved = categoryRepository.saveAndFlush(category);
        auditLogService.record(AuditEvent.EXPENSE_CATEGORY_CREATED, manager, null, null, null,
                "Expense category created.");
        return toCategory(saved);
    }

    @Transactional
    public ExpenseCategoryResponse updateCategory(
            String managerEmail, Integer categoryId, UpdateExpenseCategoryRequest input
    ) {
        AppUser manager = requireRole(managerEmail, UserRole.MANAGER);
        ExpenseCategory category = categoryRepository.findByIdForUpdate(categoryId)
                .orElseThrow(() -> new EntityNotFoundException("Expense category not found."));
        String name = input.name().trim();
        if (categoryRepository.existsByNameIgnoreCaseAndExpenseCategoryIdNot(name, categoryId)) {
            throw new DomainConflictException("An expense category with this name already exists.");
        }
        category.setName(name);
        category.setDescription(trimToNull(input.description()));
        category.setActive(input.active());
        category.setUpdatedBy(manager);
        category.setUpdatedAt(after(category.getUpdatedAt()));
        categoryRepository.flush();
        auditLogService.record(AuditEvent.EXPENSE_CATEGORY_UPDATED, manager, null, null, null,
                "Expense category updated.");
        return toCategory(category);
    }

    @Transactional
    public OperationalExpenseResponse createExpense(String actorEmail, CreateOperationalExpenseRequest input) {
        AppUser actor = requireReceptionRole(actorEmail);
        if (input.expenseDate().isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("Expense date cannot be in the future.");
        }
        ExpenseCategory category = categoryRepository.findByIdForUpdate(input.categoryId())
                .orElseThrow(() -> new EntityNotFoundException("Expense category not found."));
        if (!category.isActive()) {
            throw new DomainConflictException("An expense can only use an active category.");
        }
        OperationalExpense expense = new OperationalExpense();
        expense.setCategory(category);
        expense.setName(input.name().trim());
        expense.setDescription(trimToNull(input.description()));
        expense.setAmount(input.amount());
        expense.setExpenseDate(input.expenseDate());
        expense.setCreatedBy(actor);
        expense.setCreatedAt(Instant.now());
        OperationalExpense saved = expenseRepository.saveAndFlush(expense);
        auditLogService.record(AuditEvent.OPERATIONAL_EXPENSE_RECORDED, actor, null, null, null,
                "Operational expense recorded.");
        return toExpense(saved);
    }

    @Transactional(readOnly = true)
    public PageResponse<OperationalExpenseResponse> expenses(
            LocalDate dateFrom, LocalDate dateTo, Integer categoryId, Integer createdBy,
            Boolean voided, Pageable pageable
    ) {
        if (dateFrom != null && dateTo != null && dateFrom.isAfter(dateTo)) {
            throw new IllegalArgumentException("Expense dateFrom cannot be after dateTo.");
        }
        Specification<OperationalExpense> specification = Specification.allOf();
        if (dateFrom != null) {
            specification = specification.and((root, query, cb) ->
                    cb.greaterThanOrEqualTo(root.get("expenseDate"), dateFrom));
        }
        if (dateTo != null) {
            specification = specification.and((root, query, cb) ->
                    cb.lessThanOrEqualTo(root.get("expenseDate"), dateTo));
        }
        if (categoryId != null) {
            specification = specification.and((root, query, cb) ->
                    cb.equal(root.get("category").get("expenseCategoryId"), categoryId));
        }
        if (createdBy != null) {
            specification = specification.and((root, query, cb) ->
                    cb.equal(root.get("createdBy").get("userId"), createdBy));
        }
        if (voided != null) {
            specification = specification.and((root, query, cb) -> voided
                    ? cb.isNotNull(root.get("voidedAt")) : cb.isNull(root.get("voidedAt")));
        }
        return PageResponse.from(expenseRepository.findAll(specification, pageable)
                .map(OperationalExpenseService::toExpense));
    }

    @Transactional(readOnly = true)
    public OperationalExpenseResponse expense(Long expenseId) {
        return toExpense(expenseRepository.findById(expenseId)
                .orElseThrow(() -> new EntityNotFoundException("Operational expense not found.")));
    }

    @Transactional
    public OperationalExpenseResponse voidExpense(String managerEmail, Long expenseId, String reason) {
        AppUser manager = requireRole(managerEmail, UserRole.MANAGER);
        OperationalExpense expense = expenseRepository.findByIdForUpdate(expenseId)
                .orElseThrow(() -> new EntityNotFoundException("Operational expense not found."));
        if (expense.getVoidedAt() == null) {
            expense.setVoidedBy(manager);
            expense.setVoidedAt(Instant.now());
            expense.setVoidReason(reason.trim());
            expenseRepository.flush();
            auditLogService.record(AuditEvent.OPERATIONAL_EXPENSE_VOIDED, manager, null, null, null,
                    "Operational expense voided.");
        }
        return toExpense(expense);
    }

    private AppUser requireReceptionRole(String email) {
        AppUser actor = appUserRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new EntityNotFoundException("Authenticated user not found."));
        if (!actor.isActive() || (actor.getRole() != UserRole.MANAGER && actor.getRole() != UserRole.AGENT)) {
            throw new DomainConflictException("Only an active manager or agent can record operational expenses.");
        }
        return actor;
    }

    private AppUser requireRole(String email, UserRole role) {
        AppUser actor = appUserRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new EntityNotFoundException("Authenticated user not found."));
        if (!actor.isActive() || actor.getRole() != role) {
            throw new DomainConflictException("Only an active manager can manage operational expenses.");
        }
        return actor;
    }

    private static ExpenseCategoryResponse toCategory(ExpenseCategory category) {
        return new ExpenseCategoryResponse(
                category.getExpenseCategoryId(), category.getName(), category.getDescription(), category.isActive(),
                category.getCreatedBy().getUserId(), category.getCreatedAt(), category.getUpdatedBy().getUserId(),
                category.getUpdatedAt());
    }

    private static OperationalExpenseResponse toExpense(OperationalExpense expense) {
        AppUser author = expense.getCreatedBy();
        return new OperationalExpenseResponse(
                expense.getOperationalExpenseId(), expense.getCategory().getExpenseCategoryId(),
                expense.getCategory().getName(), expense.getName(), expense.getDescription(), expense.getAmount(),
                expense.getExpenseDate(), author.getUserId(), author.getName(), author.getSurname(),
                expense.getCreatedAt(), expense.getVoidedAt() != null,
                expense.getVoidedBy() == null ? null : expense.getVoidedBy().getUserId(), expense.getVoidedAt(),
                expense.getVoidReason());
    }

    private static String trimToNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }

    private static Instant after(Instant previous) {
        Instant now = Instant.now();
        return now.isAfter(previous) ? now : previous.plusMillis(1);
    }
}
