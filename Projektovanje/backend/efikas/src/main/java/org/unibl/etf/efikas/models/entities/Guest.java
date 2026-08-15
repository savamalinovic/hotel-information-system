package org.unibl.etf.efikas.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.unibl.etf.efikas.models.enums.Gender;

import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "guest", schema = "efikas")
public class Guest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"GuestId\"", nullable = false)
    private Integer guestId;

    @Column(name = "\"CitizenId\"", nullable = false, length = 30)
    private String citizenId;

    @Column(name = "\"IsLocal\"", nullable = false)
    private boolean local;

    @Column(name = "\"PersonalDocumentURL\"", length = 500)
    private String personalDocumentUrl;

    @Column(name = "\"Name\"", nullable = false, length = 50)
    private String name;

    @Column(name = "\"Surname\"", nullable = false, length = 50)
    private String surname;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "\"Gender\"", nullable = false)
    private Gender gender;

    @Column(name = "\"PhoneNumber\"", length = 30)
    private String phoneNumber;

    @Column(name = "\"BirthDate\"", nullable = false)
    private LocalDate birthDate;

    @Column(name = "\"BirthPlace\"", nullable = false, length = 50)
    private String birthPlace;

    @Column(name = "\"BirthMunicipality\"", length = 50)
    private String birthMunicipality;

    @Column(name = "\"BirthCountry\"", nullable = false, length = 50)
    private String birthCountry;

    @Column(name = "\"Address\"", nullable = false, length = 100)
    private String address;

    @Column(name = "\"Citizenship\"", length = 50)
    private String citizenship;

    @Column(name = "\"PassportNumber\"", length = 30)
    private String passportNumber;

    @Column(name = "\"PassportIssuedDate\"")
    private LocalDate passportIssuedDate;

    @Column(name = "\"VisaType\"", length = 30)
    private String visaType;

    @Column(name = "\"VisaNumber\"", length = 30)
    private String visaNumber;

    @Column(name = "\"PermittedResidenceDate\"")
    private LocalDate permittedResidenceDate;

    @Column(name = "\"EntryDate\"")
    private LocalDate entryDate;

    @Column(name = "\"EntryPlace\"", length = 50)
    private String entryPlace;

    @Version
    @Column(name = "\"Version\"", nullable = false)
    private Long version;

    @Column(name = "\"CreatedAt\"", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "\"UpdatedAt\"", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
