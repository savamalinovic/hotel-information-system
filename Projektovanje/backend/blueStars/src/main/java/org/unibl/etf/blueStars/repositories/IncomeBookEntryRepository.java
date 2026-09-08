package org.unibl.etf.blueStars.repositories;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.unibl.etf.blueStars.models.entities.IncomeBookEntry;

import java.time.LocalDate;
import java.util.Optional;

public interface IncomeBookEntryRepository extends JpaRepository<IncomeBookEntry, Long> {
    Optional<IncomeBookEntry> findByReservationReservationId(Integer reservationId);

    @Query("""
            select entry from IncomeBookEntry entry
            where entry.accountingDate >= :fromInclusive
              and entry.accountingDate <= :toInclusive
              and (lower(entry.receiptNumber) like lower(concat('%', :query, '%'))
                   or lower(entry.description) like lower(concat('%', :query, '%')))
            """)
    Page<IncomeBookEntry> search(
            LocalDate fromInclusive,
            LocalDate toInclusive,
            String query,
            Pageable pageable
    );
}
