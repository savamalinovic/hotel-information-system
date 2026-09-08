package org.unibl.etf.blueStars.repositories;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.unibl.etf.blueStars.models.responses.AnalyticsResponse;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class AnalyticsReadRepository {
    private static final BigDecimal ZERO = new BigDecimal("0.00");
    private final JdbcTemplate jdbc;

    public FinancialTotals financialTotals(LocalDate from, LocalDate to) {
        return jdbc.queryForObject("""
                WITH cohort AS (
                    SELECT r."ReservationId",
                           r."NightlyRate" * (r."CheckOutDate" - r."CheckInDate") AS due
                    FROM efikas.reservation r
                    WHERE r."CheckInDate" BETWEEN ? AND ?
                      AND r."Status" NOT IN ('CANCELLED', 'NO_SHOW')
                ), payments AS (
                    SELECT p."ReservationId", SUM(p."Amount") AS paid
                    FROM efikas.payment p JOIN cohort c USING ("ReservationId")
                    GROUP BY p."ReservationId"
                )
                SELECT
                    (SELECT COALESCE(SUM(i."TotalRevenue"), 0) FROM efikas.income_book_entry i
                     WHERE i."AccountingDate" BETWEEN ? AND ?),
                    (SELECT COALESCE(SUM(e."Amount"), 0) FROM efikas.operational_expense e
                     WHERE e."ExpenseDate" BETWEEN ? AND ? AND e."VoidedAt" IS NULL),
                    COALESCE(SUM(c.due), 0), COUNT(c."ReservationId"),
                    COALESCE(SUM(COALESCE(p.paid, 0)), 0),
                    COALESCE(SUM(GREATEST(c.due - COALESCE(p.paid, 0), 0)), 0)
                FROM cohort c LEFT JOIN payments p USING ("ReservationId")
                """, (rs, row) -> new FinancialTotals(
                        money(rs.getBigDecimal(1)), money(rs.getBigDecimal(2)), money(rs.getBigDecimal(3)),
                        rs.getLong(4), money(rs.getBigDecimal(5)), money(rs.getBigDecimal(6))),
                from, to, from, to, from, to);
    }

    public List<AnalyticsResponse.DailyFinancialPoint> dailyTrend(LocalDate from, LocalDate to) {
        return jdbc.query("""
                WITH days AS (
                    SELECT generate_series(?::date, ?::date, interval '1 day')::date AS day
                ), revenue AS (
                    SELECT "AccountingDate" AS day, SUM("TotalRevenue") AS amount
                    FROM efikas.income_book_entry WHERE "AccountingDate" BETWEEN ? AND ?
                    GROUP BY "AccountingDate"
                ), expense AS (
                    SELECT "ExpenseDate" AS day, SUM("Amount") AS amount
                    FROM efikas.operational_expense
                    WHERE "ExpenseDate" BETWEEN ? AND ? AND "VoidedAt" IS NULL
                    GROUP BY "ExpenseDate"
                )
                SELECT days.day, COALESCE(revenue.amount, 0), COALESCE(expense.amount, 0)
                FROM days LEFT JOIN revenue USING (day) LEFT JOIN expense USING (day)
                ORDER BY days.day
                """, (rs, row) -> new AnalyticsResponse.DailyFinancialPoint(
                        rs.getObject(1, LocalDate.class), money(rs.getBigDecimal(2)), money(rs.getBigDecimal(3))),
                from, to, from, to, from, to);
    }

    public List<AnalyticsResponse.NamedAmount> revenueByApartmentType(LocalDate from, LocalDate to) {
        return namedAmounts("""
                SELECT type."Name", COALESCE(SUM(income."TotalRevenue"), 0)
                FROM efikas.income_book_entry income
                JOIN efikas.reservation reservation USING ("ReservationId")
                JOIN efikas.apartment_type type
                  ON type."ApartmentTypeId" = reservation."ApartmentTypeSnapshotId"
                WHERE income."AccountingDate" BETWEEN ? AND ?
                GROUP BY type."ApartmentTypeId", type."Name" ORDER BY type."Name"
                """, from, to);
    }

    public List<AnalyticsResponse.NamedAmount> expensesByCategory(LocalDate from, LocalDate to) {
        return namedAmounts("""
                SELECT category."Name", COALESCE(SUM(expense."Amount"), 0)
                FROM efikas.operational_expense expense
                JOIN efikas.expense_category category USING ("ExpenseCategoryId")
                WHERE expense."ExpenseDate" BETWEEN ? AND ? AND expense."VoidedAt" IS NULL
                GROUP BY category."ExpenseCategoryId", category."Name" ORDER BY category."Name"
                """, from, to);
    }

    public DamageTotals damageTotals(LocalDate from, LocalDate to) {
        return jdbc.queryForObject("""
                SELECT COUNT(*), COALESCE(SUM("ConfirmedAmount"), 0)
                FROM efikas.damage_record
                WHERE "CreatedAt" >= ?::date AND "CreatedAt" < (?::date + 1)
                """, (rs, row) -> new DamageTotals(rs.getLong(1), money(rs.getBigDecimal(2))), from, to);
    }

    public ReservationTotals reservationTotals(LocalDate from, LocalDate to) {
        return jdbc.queryForObject("""
                WITH eligible AS (
                    SELECT * FROM efikas.reservation
                    WHERE "Status" NOT IN ('CANCELLED', 'NO_SHOW')
                      AND "CheckInDate" < (?::date + 1) AND "CheckOutDate" > ?::date
                ), occupied AS (
                    SELECT COALESCE(SUM(LEAST("CheckOutDate", ?::date + 1)
                                      - GREATEST("CheckInDate", ?::date)), 0) AS nights
                    FROM eligible
                ), capacity AS (
                    SELECT COUNT(*) AS nights
                    FROM efikas.apartment apartment
                    CROSS JOIN generate_series(?::date, ?::date, interval '1 day') day
                    WHERE apartment."Active" = true
                      AND NOT EXISTS (
                        SELECT 1 FROM efikas.apartment_unavailability unavailable
                        WHERE unavailable."ApartmentId" = apartment."ApartmentId"
                          AND day::date BETWEEN unavailable."StartDate" AND unavailable."EndDate")
                )
                SELECT (SELECT COUNT(*) FROM efikas.reservation
                        WHERE "CheckInDate" BETWEEN ? AND ?),
                       occupied.nights, capacity.nights
                FROM occupied CROSS JOIN capacity
                """, (rs, row) -> new ReservationTotals(rs.getLong(1), rs.getLong(2), rs.getLong(3)),
                to, from, to, from, from, to, from, to);
    }

    public List<AnalyticsResponse.NamedCount> reservationsByStatus(LocalDate from, LocalDate to) {
        return namedCounts("""
                WITH statuses(name) AS (VALUES ('CONFIRMED'), ('CHECKED_IN'), ('CHECKED_OUT'),
                    ('CANCELLED'), ('NO_SHOW')), counts AS (
                    SELECT "Status" AS name, COUNT(*) AS amount FROM efikas.reservation
                    WHERE "CheckInDate" BETWEEN ? AND ? GROUP BY "Status")
                SELECT statuses.name, COALESCE(counts.amount, 0)
                FROM statuses LEFT JOIN counts USING (name) ORDER BY statuses.name
                """, from, to);
    }

    public List<AnalyticsResponse.ApartmentTypeOccupancy> occupancyByApartmentType(
            LocalDate from, LocalDate to) {
        return jdbc.query("""
                WITH types AS (
                    SELECT DISTINCT type."ApartmentTypeId", type."Name"
                    FROM efikas.apartment_type type
                    JOIN efikas.apartment apartment USING ("ApartmentTypeId")
                    WHERE apartment."Active" = true
                ), capacity AS (
                    SELECT apartment."ApartmentTypeId", COUNT(*) AS capacity
                    FROM efikas.apartment apartment
                    CROSS JOIN generate_series(?::date, ?::date, interval '1 day') day
                    WHERE apartment."Active" = true AND NOT EXISTS (
                        SELECT 1 FROM efikas.apartment_unavailability unavailable
                        WHERE unavailable."ApartmentId" = apartment."ApartmentId"
                          AND day::date BETWEEN unavailable."StartDate" AND unavailable."EndDate")
                    GROUP BY apartment."ApartmentTypeId"
                ), cohort AS (
                    SELECT apartment."ApartmentTypeId", COUNT(*) AS reservations
                    FROM efikas.reservation reservation
                    JOIN efikas.apartment apartment USING ("ApartmentId")
                    WHERE reservation."CheckInDate" BETWEEN ? AND ?
                    GROUP BY apartment."ApartmentTypeId"
                ), stays AS (
                    SELECT apartment."ApartmentTypeId",
                           COALESCE(SUM(LEAST(reservation."CheckOutDate", ?::date + 1)
                                      - GREATEST(reservation."CheckInDate", ?::date)), 0) AS occupied
                    FROM efikas.reservation reservation
                    JOIN efikas.apartment apartment USING ("ApartmentId")
                    WHERE reservation."Status" NOT IN ('CANCELLED', 'NO_SHOW')
                      AND reservation."CheckInDate" < (?::date + 1)
                      AND reservation."CheckOutDate" > ?::date
                    GROUP BY apartment."ApartmentTypeId"
                )
                SELECT types."Name", COALESCE(cohort.reservations, 0), COALESCE(stays.occupied, 0),
                       COALESCE(capacity.capacity, 0)
                FROM types LEFT JOIN stays USING ("ApartmentTypeId")
                           LEFT JOIN capacity USING ("ApartmentTypeId")
                           LEFT JOIN cohort USING ("ApartmentTypeId")
                ORDER BY types."Name"
                """, (rs, row) -> {
                    long occupied = rs.getLong(3);
                    long capacity = rs.getLong(4);
                    return new AnalyticsResponse.ApartmentTypeOccupancy(
                            rs.getString(1), rs.getLong(2), occupied, capacity, occupied,
                            percentage(occupied, capacity));
                }, from, to, from, to, to, from, to, from);
    }

    public List<AnalyticsResponse.NamedCount> tasksByStatus(LocalDate from, LocalDate to) {
        return namedCounts("""
                WITH statuses(name) AS (VALUES ('NEW'), ('ASSIGNED'), ('IN_PROGRESS'), ('BLOCKED'),
                    ('COMPLETED'), ('CANCELLED')), counts AS (
                    SELECT "Status" AS name, COUNT(*) AS amount FROM efikas.operational_task
                    WHERE "CreatedAt" >= ?::date AND "CreatedAt" < (?::date + 1)
                    GROUP BY "Status")
                SELECT statuses.name, COALESCE(counts.amount, 0)
                FROM statuses LEFT JOIN counts USING (name) ORDER BY statuses.name
                """, from, to);
    }

    public List<AnalyticsResponse.NamedCount> tasksBySpecialization(LocalDate from, LocalDate to) {
        return namedCounts("""
                SELECT specialization."Code", COUNT(task."TaskId")
                FROM efikas.specialization specialization
                LEFT JOIN efikas.operational_task task
                  ON task."SpecializationId" = specialization."SpecializationId"
                 AND task."CreatedAt" >= ?::date AND task."CreatedAt" < (?::date + 1)
                GROUP BY specialization."Code" ORDER BY specialization."Code"
                """, from, to);
    }

    public List<AnalyticsResponse.WorkerCompletion> completedByWorker(LocalDate from, LocalDate to) {
        return jdbc.query("""
                SELECT actor."UserId", actor."Name" || ' ' || actor."Surname", COUNT(*)
                FROM efikas.task_status_history history
                JOIN efikas.app_user actor ON actor."UserId" = history."ActorId"
                WHERE history."ToStatus" = 'COMPLETED'
                  AND history."ChangedAt" >= ?::date AND history."ChangedAt" < (?::date + 1)
                GROUP BY actor."UserId", actor."Name", actor."Surname"
                ORDER BY COUNT(*) DESC, actor."UserId"
                """, (rs, row) -> new AnalyticsResponse.WorkerCompletion(
                        rs.getInt(1), rs.getString(2), rs.getLong(3)), from, to);
    }

    public BigDecimal averageCheckoutToReadyMinutes(LocalDate from, LocalDate to) {
        BigDecimal result = jdbc.queryForObject("""
                SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (history."ChangedAt" - reservation."CheckedOutAt")) / 60), 0)
                FROM efikas.reservation reservation
                JOIN efikas.operational_task task
                  ON task."ReservationId" = reservation."ReservationId" AND task."Source" = 'CHECKOUT'
                JOIN efikas.task_status_history history
                  ON history."TaskId" = task."TaskId" AND history."ToStatus" = 'COMPLETED'
                WHERE reservation."CheckedOutAt" >= ?::date
                  AND reservation."CheckedOutAt" < (?::date + 1)
                  AND history."ChangedAt" >= reservation."CheckedOutAt"
                """, BigDecimal.class, from, to);
        return money(result);
    }

    private List<AnalyticsResponse.NamedAmount> namedAmounts(String sql, Object... args) {
        return jdbc.query(sql, (rs, row) -> new AnalyticsResponse.NamedAmount(
                rs.getString(1), money(rs.getBigDecimal(2))), args);
    }

    private List<AnalyticsResponse.NamedCount> namedCounts(String sql, Object... args) {
        return jdbc.query(sql, (rs, row) -> new AnalyticsResponse.NamedCount(
                rs.getString(1), rs.getLong(2)), args);
    }

    public static BigDecimal percentage(long value, long total) {
        if (total == 0) return ZERO;
        return BigDecimal.valueOf(value).multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(total), 2, java.math.RoundingMode.HALF_UP);
    }

    private static BigDecimal money(BigDecimal value) {
        return value == null ? ZERO : value;
    }

    public record FinancialTotals(BigDecimal revenue, BigDecimal expenses, BigDecimal obligation,
                                  long reservationCount, BigDecimal paid, BigDecimal unpaid) {}
    public record DamageTotals(long count, BigDecimal confirmedAmount) {}
    public record ReservationTotals(long reservationCount, long occupiedNights, long capacityNights) {}
}
