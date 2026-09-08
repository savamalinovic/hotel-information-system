package org.unibl.etf.blueStars.models.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.hibernate.type.SqlTypes;

@Getter
@Setter
@Entity
@Table(name = "store", schema = "efikas")
public class Store {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"StoreId\"", nullable = false)
    private Integer id;

    @NotNull
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.RESTRICT)
    @JoinColumn(name = "\"UserId\"", nullable = false)
    private AppUser user;

    @Size(max = 50)
    @NotNull
    @Column(name = "\"Name\"", nullable = false, length = 50)
    private String name;

    @Size(max = 50)
    @NotNull
    @Column(name = "\"Address\"", nullable = false, length = 50)
    private String address;

    @Size(max = 30)
    @NotNull
    @Column(name = "\"Activity\"", nullable = false, length = 30)
    private String activity;

    @Size(max = 10)
    @NotNull
    @Column(name = "\"ActivityCode\"", nullable = false, length = 10)
    private String activityCode;

    @Size(max = 13)
    @NotNull
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "\"JIB\"", nullable = false, length = 13)
    private String jib;


}