package org.unibl.etf.blueStars.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.unibl.etf.blueStars.models.entities.HotelProfile;

@Repository
public interface HotelProfileRepository extends JpaRepository<HotelProfile, Short> {
}
