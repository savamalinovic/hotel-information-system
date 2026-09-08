package org.unibl.etf.blueStars.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.unibl.etf.blueStars.models.entities.GuestsBook;

import java.util.List;
import java.util.Optional;

public interface GuestsBookRepository extends
        JpaRepository<GuestsBook, Integer>,
        JpaSpecificationExecutor<GuestsBook> {
    Optional<GuestsBook> findByCitizenId(String citizenId);

    boolean existsByPhoneNumber(String phoneNumber);

    @Query("""
        SELECT DISTINCT g
        FROM GuestsBook g
        JOIN Reservation r ON r.guest = g
        WHERE :userId IS NOT NULL
    """)
    List<GuestsBook> findDistinctGuestsByUserId(@Param("userId") Integer userId);
}
