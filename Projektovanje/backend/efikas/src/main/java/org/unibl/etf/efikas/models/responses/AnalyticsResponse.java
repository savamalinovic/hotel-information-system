package org.unibl.etf.efikas.models.responses;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Schema(description = "Manager analytics for one inclusive date period.")
public record AnalyticsResponse(
        Period period,
        Financial financial,
        Reservations reservations,
        Tasks tasks,
        Workforce workforce
) {
    public record Period(LocalDate from, LocalDate to) {}

    public record Financial(
            BigDecimal revenue,
            BigDecimal operationalExpenses,
            BigDecimal netResult,
            BigDecimal averageReservationValue,
            BigDecimal paidAmount,
            BigDecimal unpaidAmount,
            long damageCount,
            BigDecimal confirmedDamageAmount,
            List<DailyFinancialPoint> dailyTrend,
            List<NamedAmount> revenueByApartmentType,
            List<NamedAmount> expensesByCategory
    ) {}

    public record DailyFinancialPoint(
            LocalDate date, BigDecimal revenue, BigDecimal operationalExpenses
    ) {}

    public record NamedAmount(String name, BigDecimal amount) {}

    public record Reservations(
            long reservationCount,
            long nights,
            long capacityApartmentNights,
            long occupiedApartmentNights,
            BigDecimal occupancyPercentage,
            List<NamedCount> byStatus,
            List<ApartmentTypeOccupancy> byApartmentType
    ) {}

    public record ApartmentTypeOccupancy(
            String apartmentType,
            long reservationCount,
            long nights,
            long capacityApartmentNights,
            long occupiedApartmentNights,
            BigDecimal occupancyPercentage
    ) {}

    public record Tasks(
            List<NamedCount> byStatus,
            List<NamedCount> bySpecialization,
            long newCount,
            long blockedCount,
            List<WorkerCompletion> completedByWorker,
            BigDecimal averageCheckoutToReadyMinutes
    ) {}

    public record NamedCount(String name, long count) {}
    public record WorkerCompletion(Integer workerId, String workerName, long completedTasks) {}
    public record Workforce(long presentWorkers, long availableWorkers, long busyWorkers) {}
}
