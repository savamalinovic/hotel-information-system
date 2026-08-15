package org.unibl.etf.efikas.repositories;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.unibl.etf.efikas.models.entities.GuestBookEntry;
import org.unibl.etf.efikas.models.enums.GuestBookType;

import java.time.Instant;

public interface GuestBookEntryRepository extends JpaRepository<GuestBookEntry, Long> {
    long countByReservationReservationId(Integer reservationId);

    @Query("""
            select entry from GuestBookEntry entry
            where entry.bookType = :bookType
              and entry.arrivedAt >= :fromInclusive
              and entry.arrivedAt < :toExclusive
              and (lower(entry.name) like lower(concat('%', :query, '%'))
                   or lower(entry.surname) like lower(concat('%', :query, '%'))
                   or lower(entry.citizenId) like lower(concat('%', :query, '%'))
                   or lower(entry.apartmentName) like lower(concat('%', :query, '%'))
                   or lower(coalesce(entry.passportNumber, '')) like lower(concat('%', :query, '%')))
            """)
    Page<GuestBookEntry> search(
            GuestBookType bookType,
            Instant fromInclusive,
            Instant toExclusive,
            String query,
            Pageable pageable
    );
}
