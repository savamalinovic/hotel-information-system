package org.unibl.etf.efikas.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.unibl.etf.efikas.models.entities.ApartmentPicture;
import java.util.List;
import java.util.Optional;

@Repository
public interface ApartmentPictureRepository extends JpaRepository<ApartmentPicture, Long> {
    List<ApartmentPicture> findByApartmentApartmentIdOrderByDisplayOrderAscPictureIdAsc(Integer apartmentId);
    Optional<ApartmentPicture> findByPictureIdAndApartmentApartmentId(Long pictureId, Integer apartmentId);
}
