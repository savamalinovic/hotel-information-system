package org.unibl.etf.efikas.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "attendance_session", schema = "efikas")
public class AttendanceSession {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"AttendanceSessionId\"", nullable = false)
    private Long attendanceSessionId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"WorkerId\"", nullable = false)
    private AppUser worker;

    @Column(name = "\"ClockedInAt\"", nullable = false, updatable = false)
    private Instant clockedInAt;

    @Column(name = "\"ClockedOutAt\"")
    private Instant clockedOutAt;
}
