package org.unibl.etf.blueStars.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;
import org.unibl.etf.blueStars.models.entities.ApartmentType;

@Repository
public interface ApartmentTypeRepository extends JpaRepository<ApartmentType, Integer>, JpaSpecificationExecutor<ApartmentType> {
    boolean existsByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCaseAndApartmentTypeIdNot(String name, Integer apartmentTypeId);
}
