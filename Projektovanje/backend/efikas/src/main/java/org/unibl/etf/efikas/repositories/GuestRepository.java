package org.unibl.etf.efikas.repositories;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.unibl.etf.efikas.models.entities.Guest;

import java.util.Optional;

public interface GuestRepository extends JpaRepository<Guest, Integer> {
    Optional<Guest> findByCitizenIdIgnoreCase(String citizenId);

    @Query("""
            select guest from Guest guest
            where :query is null
               or lower(guest.name) like lower(concat('%', :query, '%'))
               or lower(guest.surname) like lower(concat('%', :query, '%'))
               or lower(guest.citizenId) like lower(concat('%', :query, '%'))
            """)
    Page<Guest> search(String query, Pageable pageable);
}
