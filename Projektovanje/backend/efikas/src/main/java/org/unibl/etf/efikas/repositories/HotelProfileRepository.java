package org.unibl.etf.efikas.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.unibl.etf.efikas.models.entities.HotelProfile;

@Repository
public interface HotelProfileRepository extends JpaRepository<HotelProfile, Short> {
}
