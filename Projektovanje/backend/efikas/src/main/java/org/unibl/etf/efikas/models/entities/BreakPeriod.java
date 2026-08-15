package org.unibl.etf.efikas.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "break_period", schema = "efikas")
public class BreakPeriod {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"BreakPeriodId\"", nullable = false)
    private Long breakPeriodId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"AttendanceSessionId\"", nullable = false)
    private AttendanceSession attendanceSession;

    @Column(name = "\"StartedAt\"", nullable = false, updatable = false)
    private Instant startedAt;

    @Column(name = "\"EndedAt\"")
    private Instant endedAt;
}
