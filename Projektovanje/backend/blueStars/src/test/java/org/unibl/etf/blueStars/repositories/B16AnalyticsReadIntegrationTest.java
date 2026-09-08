package org.unibl.etf.blueStars.repositories;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.unibl.etf.blueStars.models.entities.AppUser;
import org.unibl.etf.blueStars.models.enums.UserRole;
import org.unibl.etf.blueStars.models.requests.*;
import org.unibl.etf.blueStars.services.*;
import org.unibl.etf.blueStars.services.interfaces.S3Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class B16AnalyticsReadIntegrationTest {
    @Autowired AnalyticsReadRepository analytics;
    @Autowired JdbcTemplate jdbc;
    @Autowired AppUserRepository users;
    @Autowired SpecializationRepository specializations;
    @Autowired ApartmentTypeService apartmentTypes;
    @Autowired ApartmentService apartments;
    @Autowired ReservationService reservations;
    @Autowired PaymentService payments;
    @Autowired OperationalExpenseService expenseCategories;
    @Autowired WorkforceAvailabilityService workforce;
    @MockitoBean S3Service storage;

    @Test
    void emptyPeriodReturnsZerosAndCompleteDailyTrendWithoutNulls() {
        LocalDate from = LocalDate.of(2098, 2, 1);
        LocalDate to = LocalDate.of(2098, 2, 3);

        var financial = analytics.financialTotals(from, to);
        var damages = analytics.damageTotals(from, to);
        var reservations = analytics.reservationTotals(from, to);

        assertThat(financial.revenue()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(financial.expenses()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(financial.paid()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(financial.unpaid()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(damages.confirmedAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(reservations.occupiedNights()).isZero();
        assertThat(analytics.dailyTrend(from, to)).hasSize(3).allSatisfy(point -> {
            assertThat(point.revenue()).isNotNull().isEqualByComparingTo(BigDecimal.ZERO);
            assertThat(point.operationalExpenses()).isNotNull().isEqualByComparingTo(BigDecimal.ZERO);
        });
        assertThat(analytics.occupancyByApartmentType(from, to))
                .allSatisfy(row -> assertThat(row.occupancyPercentage()).isNotNull());
        assertThat(analytics.averageCheckoutToReadyMinutes(from, to)).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void revenueByApartmentTypeUsesReservationSnapshotAfterApartmentTypeChanges() {
        LocalDate accountingDate = LocalDate.of(2096, 4, 15);
        AppUser manager = user("snapshot-manager", UserRole.MANAGER);
        String originalTypeName = "B16 original revenue type " + suffix();
        String laterTypeName = "B16 later revenue type " + suffix();
        var originalType = apartmentTypes.create(new ApartmentTypeRequest(
                originalTypeName, null, 2, new BigDecimal("90.00")));
        var laterType = apartmentTypes.create(new ApartmentTypeRequest(
                laterTypeName, null, 2, new BigDecimal("110.00")));
        var apartment = apartments.create(new ApartmentRequest(
                "B16 snapshot apartment " + suffix(), "Snapshot analytics address", 1,
                originalType.apartmentTypeId()), manager.getEmail());
        var reservation = reservations.create(new CreateReservationRequest(
                apartment.apartmentId(), accountingDate, accountingDate.plusDays(2),
                1, null, null), manager.getEmail());

        apartments.update(apartment.apartmentId(), new ApartmentRequest(
                apartment.name(), apartment.address(), apartment.floor(), laterType.apartmentTypeId()));

        jdbc.update("SET LOCAL session_replication_role = replica");
        try {
            jdbc.update("""
                    INSERT INTO efikas.income_book_entry
                    ("ReservationId", "ReceiptNumber", "AccountingDate", "Description",
                     "ServiceSaleRevenue", "TotalRevenue", "VatAmount")
                    VALUES (?, ?, ?, 'B16 snapshot revenue', 275.50, 275.50, 0.00)
                    """, reservation.reservationId(), "B16-SNAPSHOT-" + suffix(), accountingDate);
        } finally {
            jdbc.update("SET LOCAL session_replication_role = origin");
        }

        var revenueByType = analytics.revenueByApartmentType(accountingDate, accountingDate);

        assertThat(revenueByType).anySatisfy(row -> {
            assertThat(row.name()).isEqualTo(originalTypeName);
            assertThat(row.amount()).isEqualByComparingTo("275.50");
        });
        assertThat(revenueByType).noneSatisfy(row -> assertThat(row.name()).isEqualTo(laterTypeName));
    }

    @Test
    void calculatesFinancialOccupancyTaskAndWorkforceMetricsFromBusinessFacts() {
        LocalDate from = LocalDate.of(2097, 6, 1);
        LocalDate to = LocalDate.of(2097, 6, 3);
        AppUser manager = user("manager", UserRole.MANAGER);
        AppUser agent = user("agent", UserRole.AGENT);
        var type = apartmentTypes.create(new ApartmentTypeRequest(
                "B16 deterministic type " + suffix(), null, 2, new BigDecimal("100.00")));
        var first = apartments.create(new ApartmentRequest(
                "B16-A-" + suffix(), "Analytics address A", 1, type.apartmentTypeId()), manager.getEmail());
        var second = apartments.create(new ApartmentRequest(
                "B16-B-" + suffix(), "Analytics address B", 1, type.apartmentTypeId()), manager.getEmail());
        var included = reservations.create(new CreateReservationRequest(
                first.apartmentId(), from, to.plusDays(1), 1, null, null), agent.getEmail());
        var cancelled = reservations.create(new CreateReservationRequest(
                second.apartmentId(), from, to.plusDays(1), 1, null, null), agent.getEmail());
        reservations.changeStatus(cancelled.reservationId(),
                new ChangeReservationStatusRequest(
                        org.unibl.etf.blueStars.models.enums.ReservationStatus.CANCELLED, "Cancelled test stay"),
                agent.getEmail());
        apartments.addUnavailability(second.apartmentId(),
                new ApartmentUnavailabilityRequest(from.plusDays(1), from.plusDays(1), "One unavailable day"),
                manager.getEmail());

        var firstPayment = payments.record(included.reservationId(),
                new RecordPaymentRequest(new BigDecimal("200.00"), null, null), agent.getEmail());
        payments.correct(included.reservationId(), firstPayment.paymentId(),
                new CorrectPaymentRequest(new BigDecimal("-50.00"), "Correction"), agent.getEmail());
        var reversed = payments.record(included.reservationId(),
                new RecordPaymentRequest(new BigDecimal("100.00"), null, null), agent.getEmail());
        payments.reverse(included.reservationId(), reversed.paymentId(),
                new ReversePaymentRequest("Reversed test payment"), agent.getEmail());

        var category = expenseCategories.createCategory(manager.getEmail(),
                new CreateExpenseCategoryRequest("B16 category " + suffix(), null));
        var cleaning = specializations.findAll().stream()
                .filter(item -> item.getCode().equals("CLEANING")).findFirst().orElseThrow();
        AppUser blockedWorker = worker("blocked", cleaning);
        AppUser completedWorker = worker("completed", cleaning);
        AppUser busyWorker = worker("busy", cleaning);
        var before = workforce.analyticsSnapshot();
        workforce.clockIn(blockedWorker.getEmail());
        workforce.clockIn(completedWorker.getEmail());
        workforce.clockIn(busyWorker.getEmail());

        jdbc.update("SET LOCAL session_replication_role = replica");
        try {
            jdbc.update("""
                    INSERT INTO efikas.income_book_entry
                    ("ReservationId", "ReceiptNumber", "AccountingDate", "Description",
                     "ServiceSaleRevenue", "TotalRevenue", "VatAmount")
                    VALUES (?, ?, ?, 'B16 revenue', 120.25, 120.25, 0.00)
                    """, included.reservationId(), "B16-" + suffix(), from.plusDays(1));
            jdbc.update("""
                    INSERT INTO efikas.operational_expense
                    ("ExpenseCategoryId", "Name", "Amount", "ExpenseDate", "CreatedBy", "CreatedAt")
                    VALUES (?, 'Included', 80.10, ?, ?, CURRENT_TIMESTAMP),
                           (?, 'Voided', 20.00, ?, ?, CURRENT_TIMESTAMP)
                    """, category.expenseCategoryId(), from, agent.getUserId(),
                    category.expenseCategoryId(), from, agent.getUserId());
            jdbc.update("""
                    UPDATE efikas.operational_expense SET "VoidedBy" = ?, "VoidedAt" = CURRENT_TIMESTAMP,
                    "VoidReason" = 'Voided test expense' WHERE "Name" = 'Voided' AND "ExpenseDate" = ?
                    """, manager.getUserId(), from);
            jdbc.update("""
                    INSERT INTO efikas.damage_record
                    ("ApartmentId", "Title", "Description", "ConfirmedAmount", "CreatedBy", "CreatedAt",
                     "UpdatedBy", "UpdatedAt") VALUES (?, 'B16 damage', 'Analytics damage', 33.33,
                     ?, ?::date + interval '12 hours', ?, ?::date + interval '12 hours')
                    """, first.apartmentId(), agent.getUserId(), from, agent.getUserId(), from);

            long blockedTask = task(cleaning.getSpecializationId(), first.apartmentId(), blockedWorker.getUserId(),
                    agent.getUserId(), "BLOCKED", "MANUAL", null, from);
            long completedTask = task(cleaning.getSpecializationId(), first.apartmentId(),
                    completedWorker.getUserId(), agent.getUserId(), "COMPLETED", "MANUAL", null, from);
            task(cleaning.getSpecializationId(), first.apartmentId(), busyWorker.getUserId(), agent.getUserId(),
                    "ASSIGNED", "MANUAL", null, from);
            task(cleaning.getSpecializationId(), first.apartmentId(), null, agent.getUserId(),
                    "NEW", "MANUAL", null, from);
            jdbc.update("""
                    INSERT INTO efikas.task_status_history
                    ("TaskId", "FromStatus", "ToStatus", "ActorId", "Reason", "ChangedAt")
                    VALUES (?, 'IN_PROGRESS', 'COMPLETED', ?, 'Completed', ?::date + interval '10 hours')
                    """, completedTask, completedWorker.getUserId(), from);

            jdbc.update("""
                    UPDATE efikas.reservation SET "Status" = 'CHECKED_OUT', "CheckedOutBy" = ?,
                    "CheckedOutAt" = ?::date + interval '8 hours' WHERE "ReservationId" = ?
                    """, agent.getUserId(), from, included.reservationId());
            long checkoutTask = task(cleaning.getSpecializationId(), first.apartmentId(),
                    completedWorker.getUserId(), agent.getUserId(), "COMPLETED", "CHECKOUT",
                    included.reservationId(), from);
            jdbc.update("""
                    INSERT INTO efikas.task_status_history
                    ("TaskId", "FromStatus", "ToStatus", "ActorId", "Reason", "ChangedAt")
                    VALUES (?, 'IN_PROGRESS', 'COMPLETED', ?, 'Ready', ?::date + interval '9 hours 30 minutes')
                    """, checkoutTask, completedWorker.getUserId(), from);
        } finally {
            jdbc.update("SET LOCAL session_replication_role = origin");
        }

        var financial = analytics.financialTotals(from, to);
        assertThat(financial.revenue()).isEqualByComparingTo("120.25");
        assertThat(financial.expenses()).isEqualByComparingTo("80.10");
        assertThat(financial.paid()).isEqualByComparingTo("150.00");
        assertThat(financial.unpaid()).isEqualByComparingTo("150.00");
        assertThat(financial.obligation()).isEqualByComparingTo("300.00");
        assertThat(analytics.dailyTrend(from, to)).extracting("revenue")
                .containsExactly(new BigDecimal("0"), new BigDecimal("120.25"), new BigDecimal("0"));
        assertThat(analytics.damageTotals(from, to).confirmedAmount()).isEqualByComparingTo("33.33");

        var typeOccupancy = analytics.occupancyByApartmentType(from, to).stream()
                .filter(row -> row.apartmentType().equals(type.name())).findFirst().orElseThrow();
        assertThat(typeOccupancy.reservationCount()).isEqualTo(2);
        assertThat(typeOccupancy.occupiedApartmentNights()).isEqualTo(3);
        assertThat(typeOccupancy.capacityApartmentNights()).isEqualTo(5);
        assertThat(typeOccupancy.occupancyPercentage()).isEqualByComparingTo("60.00");

        assertThat(count(analytics.tasksByStatus(from, to), "NEW")).isEqualTo(1);
        assertThat(count(analytics.tasksByStatus(from, to), "BLOCKED")).isEqualTo(1);
        assertThat(count(analytics.tasksBySpecialization(from, to), "CLEANING")).isEqualTo(5);
        assertThat(analytics.completedByWorker(from, to)).anySatisfy(row -> {
            assertThat(row.workerId()).isEqualTo(completedWorker.getUserId());
            assertThat(row.completedTasks()).isEqualTo(2);
        });
        assertThat(analytics.averageCheckoutToReadyMinutes(from, to)).isEqualByComparingTo("90.00");

        var after = workforce.analyticsSnapshot();
        assertThat(after.present() - before.present()).isEqualTo(3);
        assertThat(after.available() - before.available()).isEqualTo(2);
        assertThat(after.busy() - before.busy()).isEqualTo(1);
    }

    private long task(Short specializationId, Integer apartmentId, Integer workerId, Integer creatorId,
                      String status, String source, Integer reservationId, LocalDate created) {
        return jdbc.queryForObject("""
                INSERT INTO efikas.operational_task
                ("SpecializationId", "ApartmentId", "ReservationId", "AssignedWorkerId", "CreatedBy",
                 "Title", "Description", "Status", "Source", "CreatedAt", "UpdatedAt")
                VALUES (?, ?, ?, ?, ?, ?, 'B16 analytics task', ?, ?, ?::date + interval '7 hours',
                        ?::date + interval '7 hours') RETURNING "TaskId"
                """, Long.class, specializationId, apartmentId, reservationId, workerId, creatorId,
                "B16 " + status + " " + suffix(), status, source, created, created);
    }

    private AppUser worker(String label, org.unibl.etf.blueStars.models.entities.Specialization specialization) {
        AppUser worker = user(label, UserRole.OPERATIONAL_WORKER);
        worker.getSpecializations().add(specialization);
        return users.saveAndFlush(worker);
    }

    private AppUser user(String label, UserRole role) {
        String suffix = suffix();
        AppUser user = new AppUser();
        user.setName("B16");
        user.setSurname(label);
        user.setJmbg(String.format("%013d", Integer.toUnsignedLong(suffix.hashCode()) % 10_000_000_000_000L));
        user.setPasswordHash("not-a-real-password-hash");
        user.setEmail("b16-" + label + "-" + suffix + "@example.invalid");
        user.setRole(role);
        user.setAddress("Analytics integration address");
        user.setActive(true);
        return users.saveAndFlush(user);
    }

    private static long count(java.util.List<org.unibl.etf.blueStars.models.responses.AnalyticsResponse.NamedCount> rows,
                              String name) {
        return rows.stream().filter(row -> row.name().equals(name)).mapToLong(
                org.unibl.etf.blueStars.models.responses.AnalyticsResponse.NamedCount::count).findFirst().orElse(0);
    }

    private static String suffix() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    }
}
