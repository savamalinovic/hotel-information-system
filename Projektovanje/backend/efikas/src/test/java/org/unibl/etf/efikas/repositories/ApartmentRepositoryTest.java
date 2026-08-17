package org.unibl.etf.efikas.repositories;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import org.unibl.etf.efikas.models.entities.Apartment;
import org.unibl.etf.efikas.models.entities.ApartmentType;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class ApartmentRepositoryTest {

    @Autowired
    private ApartmentRepository apartmentRepository;

    @Autowired
    private ApartmentTypeRepository apartmentTypeRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void persistsAndLoadsApartmentWithItsType() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        ApartmentType type = new ApartmentType();
        type.setName("Repository test type " + suffix);
        type.setDescription("Type created only for this transactional test.");
        type.setCapacity(3);
        type.setDefaultNightlyRate(new BigDecimal("125.50"));
        type.setActive(true);
        ApartmentType savedType = apartmentTypeRepository.saveAndFlush(type);

        Apartment apartment = new Apartment();
        apartment.setName("Repository test apartment " + suffix);
        apartment.setAddress("Repository test address");
        apartment.setFloor(2);
        apartment.setType(savedType);
        apartment.setActive(true);
        Apartment savedApartment = apartmentRepository.saveAndFlush(apartment);

        entityManager.clear();

        Apartment loaded = apartmentRepository.findById(savedApartment.getApartmentId()).orElseThrow();
        assertThat(loaded.getName()).isEqualTo(apartment.getName());
        assertThat(loaded.getAddress()).isEqualTo("Repository test address");
        assertThat(loaded.getType().getApartmentTypeId()).isEqualTo(savedType.getApartmentTypeId());
        assertThat(loaded.getType().getName()).isEqualTo(type.getName());
    }
}
