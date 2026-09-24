package org.unibl.etf.blueStars.models.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.unibl.etf.blueStars.models.enums.UserRole;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Getter
@Setter
@Entity
@Table(name = "app_user", schema = "efikas")
@ToString(exclude = "specializations")
public class AppUser {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"UserId\"", nullable = false)
    private Integer userId;

    @Column(name = "\"Name\"", nullable = false, length = 50)
    private String name;

    @Column(name = "\"Surname\"", nullable = false, length = 50)
    private String surname;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "\"JMBG\"", nullable = false, length = 13)
    private String jmbg;

    @Column(name = "\"PasswordHash\"", nullable = false, length = 512)
    private String passwordHash;

    @Column(name = "\"Email\"", nullable = false, length = 50)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(name = "\"Role\"", nullable = false, length = 32)
    private UserRole role = UserRole.AGENT;

    @Size(max = 50)
    @NotNull
    @Column(name = "\"Address\"", nullable = false, length = 50)
    private String address;

    @Size(max = 30)
    @Column(name = "\"PhoneNumber\"", length = 30)
    private String phoneNumber;

    @Column(name = "\"Active\"", nullable = false)
    private boolean active = true;

    @Column(name = "\"CreatedAt\"", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "\"UpdatedAt\"", nullable = false)
    private Instant updatedAt;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "app_user_specialization",
            schema = "efikas",
            joinColumns = @JoinColumn(name = "\"UserId\""),
            inverseJoinColumns = @JoinColumn(name = "\"SpecializationId\"")
    )
    private Set<Specialization> specializations = new HashSet<>();

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
