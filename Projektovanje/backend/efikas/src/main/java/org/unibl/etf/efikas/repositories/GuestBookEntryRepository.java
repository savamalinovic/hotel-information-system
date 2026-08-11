package org.unibl.etf.efikas.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.unibl.etf.efikas.models.entities.GuestBookEntry;

public interface GuestBookEntryRepository extends JpaRepository<GuestBookEntry, Long> {
    long countByReservationReservationId(Integer reservationId);
}
