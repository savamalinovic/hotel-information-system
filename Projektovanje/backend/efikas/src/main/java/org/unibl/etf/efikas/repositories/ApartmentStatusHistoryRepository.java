package org.unibl.etf.efikas.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.unibl.etf.efikas.models.entities.ApartmentStatusHistory;

import java.util.List;

@Repository
public interface ApartmentStatusHistoryRepository extends JpaRepository<ApartmentStatusHistory, Long> {
    List<ApartmentStatusHistory> findByApartmentApartmentIdOrderByChangedAtDescApartmentStatusHistoryIdDesc(Integer apartmentId);
}
