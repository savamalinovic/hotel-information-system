package org.unibl.etf.blueStars.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.unibl.etf.blueStars.models.entities.AppUser;
import org.unibl.etf.blueStars.models.entities.Store;
import org.unibl.etf.blueStars.models.responses.AppUserResponse;

import java.util.Optional;

public interface StoreRepository extends JpaRepository<Store, Integer> {
    Optional<Store> findByUser(AppUser appUser);
    Boolean existsByUser(AppUser user);
}
