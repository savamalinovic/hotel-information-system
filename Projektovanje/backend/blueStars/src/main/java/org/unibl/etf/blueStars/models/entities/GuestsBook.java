package org.unibl.etf.blueStars.models.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.unibl.etf.blueStars.models.enums.Gender;

import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.Set;

@Getter
@Setter
@Entity
@Table(name = "guests_book", schema = "efikas")

public class GuestsBook {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"GuestsBookId\"", nullable = false)
    private Integer id;

    @Size(max = 30)
    @NotNull
    @Column(name = "\"CitizenId\"", nullable = false, length = 30)
    private String citizenId;

    @NotNull
    @Column(name = "\"IsLocal\"", nullable = false)
    private Boolean isLocal = true;

    @Size(max = 100)
    @Column(name = "\"PersonalDocumentURL\"", length = 100)
    private String personalDocumentURL;

    @Size(max = 50)
    @NotNull
    @Column(name = "\"Name\"", nullable = false, length = 50)
    private String name;

    @Size(max = 50)
    @NotNull
    @Column(name = "\"Surname\"", nullable = false, length = 50)
    private String surname;

    @NotNull
    @Column(name = "\"Gender\"", nullable = false)
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    private Gender gender;

    @Size(max = 30)
    @NotNull
    @Column(name = "\"PhoneNumber\"", nullable = false, length = 30)
    private String phoneNumber;

    @NotNull
    @Column(name = "\"BirthDate\"", nullable = false)
    private LocalDate birthDate;

    @Size(max = 50)
    @NotNull
    @Column(name = "\"BirthPlace\"", nullable = false, length = 50)
    private String birthPlace;

    @Size(max = 50)
    @Column(name = "\"BirthMunicipality\"", length = 50)
    private String birthMunicipality;

    @Size(max = 50)
    @NotNull
    @Column(name = "\"BirthCountry\"", nullable = false, length = 50)
    private String birthCountry;

    @Size(max = 50)
    @NotNull
    @Column(name = "\"Address\"", nullable = false, length = 50)
    private String address;

    @Size(max = 50)
    @Column(name = "\"Citizenship\"", length = 50)
    private String citizenship;

    @Size(max = 20)
    @Column(name = "\"PassportNumber\"", length = 20)
    private String passportNumber;

    @Column(name = "\"PassportIssuedDate\"")
    private LocalDate passportIssuedDate;

    @Size(max = 20)
    @Column(name = "\"VisaType\"", length = 20)
    private String visaType;

    @Size(max = 20)
    @Column(name = "\"VisaNumber\"", length = 20)
    private String visaNumber;

    @Column(name = "\"PermittedResidenceDate\"")
    private LocalDate permittedResidenceDate;

    @Column(name = "\"EntryDate\"")
    private LocalDate entryDate;

    @Size(max = 20)
    @Column(name = "\"EntryPlace\"", length = 20)
    private String entryPlace;

    @NotNull
    @Column(name = "\"AccommodationUnitNumber\"", nullable = false)
    private Integer accommodationUnitNumber;

    @NotNull
    @Column(name = "\"AccommodationUnitFloor\"", nullable = false)
    private Integer accommodationUnitFloor;

    @NotNull
    @Column(name = "\"DateTimeOfArrival\"", nullable = false)
    private Instant dateTimeOfArrival;

    @NotNull
    @Column(name = "\"DateTimeOfDeparture\"", nullable = false)
    private Instant dateTimeOfDeparture;

    @Size(max = 50)
    @Column(name = "\"IssuedInvoiceNumber\"", nullable = false, length = 50)
    private String issuedInvoiceNumber;

    @Size(max = 200)
    @Column(name = "\"Remarks\"", length = 200)
    private String remarks;

    @ColumnDefault("now()")
    @CreationTimestamp
    @Column(name = "\"CreatedAt\"")
    private Instant createdAt;

    @OneToMany(mappedBy = "guest")
    private Set<Reservation> reservations = new LinkedHashSet<>();

}