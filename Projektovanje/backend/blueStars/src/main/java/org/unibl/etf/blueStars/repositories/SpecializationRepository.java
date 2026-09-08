package org.unibl.etf.blueStars.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.unibl.etf.blueStars.models.entities.Specialization;

import java.util.List;
import java.util.Optional;

@Repository
public interface SpecializationRepository extends JpaRepository<Specialization, Short> {
    List<Specialization> findAllByOrderByCodeAsc();
    Optional<Specialization> findByCode(String code);
}
