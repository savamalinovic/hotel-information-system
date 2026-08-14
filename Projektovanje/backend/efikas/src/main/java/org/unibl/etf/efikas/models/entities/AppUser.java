package org.unibl.etf.efikas.models.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.unibl.etf.efikas.models.enums.UserRole;

@Getter
@Setter
@Entity
@Table(name = "app_user", schema = "efikas")
@ToString
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

}
