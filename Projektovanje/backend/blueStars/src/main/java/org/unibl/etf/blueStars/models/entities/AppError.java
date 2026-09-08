package org.unibl.etf.blueStars.models.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "app_errors", schema = "efikas")
public class AppError {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"ErrorId\"", nullable = false)
    private Integer id;

    @Size(max = 255)
    @NotNull
    @Column(name = "\"Note\"", nullable = false)
    private String note;


}