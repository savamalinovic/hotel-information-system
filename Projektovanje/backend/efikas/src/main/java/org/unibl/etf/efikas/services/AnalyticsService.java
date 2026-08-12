package org.unibl.etf.efikas.services;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.unibl.etf.efikas.models.entities.AppUser;
import org.unibl.etf.efikas.models.enums.UserRole;
import org.unibl.etf.efikas.models.responses.AnalyticsResponse;
import org.unibl.etf.efikas.repositories.AnalyticsReadRepository;
import org.unibl.etf.efikas.repositories.AppUserRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AnalyticsService {
    private static final BigDecimal ZERO = new BigDecimal("0.00");

    private final AnalyticsReadRepository analytics;
    private final AppUserRepository users;
    private final WorkforceAvailabilityService workforceAvailability;

    @Transactional(readOnly = true)
    public AnalyticsResponse summary(String email, LocalDate requestedFrom, LocalDate requestedTo) {
        requireActiveManager(email);
        AnalyticsResponse.Period period = resolvePeriod(requestedFrom, requestedTo);
        LocalDate from = period.from();
        LocalDate to = period.to();

        AnalyticsReadRepository.FinancialTotals totals = analytics.financialTotals(from, to);
        AnalyticsReadRepository.DamageTotals damages = analytics.damageTotals(from, to);
        BigDecimal averageReservationValue = totals.reservationCount() == 0
                ? ZERO
                : totals.obligation().divide(BigDecimal.valueOf(totals.reservationCount()), 2, RoundingMode.HALF_UP);
        AnalyticsResponse.Financial financial = new AnalyticsResponse.Financial(
                totals.revenue(), totals.expenses(), totals.revenue().subtract(totals.expenses()),
                averageReservationValue, totals.paid(), totals.unpaid(), damages.count(),
                damages.confirmedAmount(), analytics.dailyTrend(from, to),
                analytics.revenueByApartmentType(from, to), analytics.expensesByCategory(from, to));

        AnalyticsReadRepository.ReservationTotals reservationTotals = analytics.reservationTotals(from, to);
        AnalyticsResponse.Reservations reservations = new AnalyticsResponse.Reservations(
                reservationTotals.reservationCount(), reservationTotals.occupiedNights(),
                reservationTotals.capacityNights(), reservationTotals.occupiedNights(),
                AnalyticsReadRepository.percentage(
                        reservationTotals.occupiedNights(), reservationTotals.capacityNights()),
                analytics.reservationsByStatus(from, to), analytics.occupancyByApartmentType(from, to));

        List<AnalyticsResponse.NamedCount> byStatus = analytics.tasksByStatus(from, to);
        AnalyticsResponse.Tasks tasks = new AnalyticsResponse.Tasks(
                byStatus, analytics.tasksBySpecialization(from, to), count(byStatus, "NEW"),
                count(byStatus, "BLOCKED"), analytics.completedByWorker(from, to),
                analytics.averageCheckoutToReadyMinutes(from, to).setScale(2, RoundingMode.HALF_UP));

        WorkforceAvailabilityService.WorkforceSnapshot snapshot = workforceAvailability.analyticsSnapshot();
        AnalyticsResponse.Workforce workforce = new AnalyticsResponse.Workforce(
                snapshot.present(), snapshot.available(), snapshot.busy());
        return new AnalyticsResponse(period, financial, reservations, tasks, workforce);
    }

    static AnalyticsResponse.Period resolvePeriod(LocalDate from, LocalDate to) {
        if ((from == null) != (to == null)) {
            throw new IllegalArgumentException("Both analytics dates must be provided together.");
        }
        if (from == null) {
            LocalDate today = LocalDate.now();
            return new AnalyticsResponse.Period(today.withDayOfMonth(1), today);
        }
        if (from.isAfter(to)) {
            throw new IllegalArgumentException("Analytics from must not be after to.");
        }
        return new AnalyticsResponse.Period(from, to);
    }

    private void requireActiveManager(String email) {
        AppUser user = users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new EntityNotFoundException("Authenticated user not found."));
        if (!user.isActive() || user.getRole() != UserRole.MANAGER) {
            throw new AccessDeniedException("Only an active manager can read analytics.");
        }
    }

    private static long count(List<AnalyticsResponse.NamedCount> values, String name) {
        return values.stream().filter(value -> value.name().equals(name))
                .mapToLong(AnalyticsResponse.NamedCount::count).findFirst().orElse(0);
    }
}
