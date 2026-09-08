package org.unibl.etf.blueStars.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.unibl.etf.blueStars.models.entities.DemoReceipt;

import java.util.Optional;

public interface DemoReceiptRepository extends JpaRepository<DemoReceipt, Long> {
    Optional<DemoReceipt> findByReservationReservationId(Integer reservationId);

    boolean existsByReservationReservationId(Integer reservationId);

    @Query(value = "select nextval('efikas.demo_receipt_number_seq')", nativeQuery = true)
    Long nextReceiptSequence();
}
