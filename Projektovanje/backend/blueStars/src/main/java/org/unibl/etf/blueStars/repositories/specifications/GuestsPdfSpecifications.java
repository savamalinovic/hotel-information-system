package org.unibl.etf.blueStars.repositories.specifications;

import org.springframework.data.jpa.domain.Specification;
import org.unibl.etf.blueStars.models.entities.GuestsBook;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

public final class GuestsPdfSpecifications {
    public static Specification<GuestsBook> dateOfArrival(LocalDate from) {
        return (root, query, cb) ->
                from == null
                        ? cb.conjunction()
                        : cb.greaterThanOrEqualTo(
                            root.get("dateTimeOfArrival"),
                            from.atStartOfDay()
                        );
    }

    public static Specification<GuestsBook> dateOfDeparture(LocalDate to) {
        return (root, query, cb) ->
                to == null
                        ? cb.conjunction()
                        : cb.lessThanOrEqualTo(
                            root.get("dateTimeOfDeparture"),
                            to.atTime(LocalTime.MAX)
                        );
    }

    public static Specification<GuestsBook> active(Boolean active) {
        if (active == null) return Specification.unrestricted();

        LocalDateTime now = LocalDateTime.now();

        return (root, query, cb) ->
                active
                        ? cb.or(
                        cb.isNull(root.get("dateTimeOfDeparture")),
                        cb.greaterThan(root.get("dateTimeOfDeparture"), now)
                )
                        : cb.lessThanOrEqualTo(root.get("dateTimeOfDeparture"), now);
    }

    public static Specification<GuestsBook> orderForPdf() {
        return (root, query, cb) -> {
            query.orderBy(
                    cb.asc(root.get("dateTimeOfArrival")),
                    cb.asc(root.get("dateTimeOfDeparture"))
            );
            return cb.conjunction();
        };
    }

    public static Specification<GuestsBook> isLocal() {
        return (root, query, cb) -> cb.equal(root.get("isLocal"), true);
    }

    public static Specification<GuestsBook> isForeign() {
        return (root, query, cb) -> cb.equal(root.get("isLocal"), false);
    }

    public static Specification<GuestsBook> belongsToUser(Integer userId) {
        // The application manages one hotel; books are no longer partitioned by legacy apartment ownership.
        return (root, query, cb) -> userId == null ? cb.disjunction() : cb.conjunction();
    }
}
