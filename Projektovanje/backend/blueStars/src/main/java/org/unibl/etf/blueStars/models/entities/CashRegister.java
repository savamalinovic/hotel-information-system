package org.unibl.etf.blueStars.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Getter
@Setter
@Entity
@Table(name = "cash_register", schema = "efikas")
public class CashRegister {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"CashRegisterId\"", nullable = false)
    private Integer cashRegisterId;

    @Column(name = "\"CashRegisterNumber\"", nullable = false)
    private Integer cashRegisterNumber;

    @Column(name = "\"SoftwareVersion\"", nullable = false, length = 15)
    private String softwareVersion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "\"UserId\"", nullable = false)
    private AppUser user;

}