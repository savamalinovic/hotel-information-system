package org.unibl.etf.efikas.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.unibl.etf.efikas.models.entities.Specialization;

import java.util.List;

@Repository
public interface SpecializationRepository extends JpaRepository<Specialization, Short> {
    List<Specialization> findAllByOrderByCodeAsc();
}
