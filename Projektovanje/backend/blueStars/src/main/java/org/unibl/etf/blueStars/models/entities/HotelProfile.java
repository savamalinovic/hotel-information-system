package org.unibl.etf.blueStars.models.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "hotel_profile", schema = "efikas")
public class HotelProfile {
    public static final short SINGLETON_ID = 1;

    @Id
    @Column(name = "\"HotelProfileId\"", nullable = false)
    private Short hotelProfileId;

    @Column(name = "\"Name\"", nullable = false, length = 100)
    private String name;

    @Column(name = "\"LegalName\"", length = 150)
    private String legalName;

    @Column(name = "\"Address\"", length = 150)
    private String address;

    @Column(name = "\"City\"", length = 80)
    private String city;

    @Column(name = "\"CountryCode\"", length = 2)
    private String countryCode;

    @Column(name = "\"PhoneNumber\"", length = 30)
    private String phoneNumber;

    @Column(name = "\"Email\"", length = 100)
    private String email;

    @Column(name = "\"TaxId\"", length = 32)
    private String taxId;

    @Column(name = "\"UpdatedAt\"", nullable = false)
    private Instant updatedAt;

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
