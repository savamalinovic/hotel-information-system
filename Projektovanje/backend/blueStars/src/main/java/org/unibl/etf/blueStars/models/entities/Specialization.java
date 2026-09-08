package org.unibl.etf.blueStars.models.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "specialization", schema = "efikas")
public class Specialization {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"SpecializationId\"", nullable = false)
    private Short specializationId;

    @Column(name = "\"Code\"", nullable = false, length = 40, unique = true)
    private String code;

    @Column(name = "\"Name\"", nullable = false, length = 80, unique = true)
    private String name;
}
