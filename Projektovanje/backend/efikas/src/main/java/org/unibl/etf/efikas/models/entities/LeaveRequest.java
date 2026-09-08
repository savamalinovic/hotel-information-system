package org.unibl.etf.efikas.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.unibl.etf.efikas.models.enums.LeaveRequestStatus;

import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "leave_request", schema = "efikas")
public class LeaveRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"LeaveRequestId\"", nullable = false)
    private Long leaveRequestId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "\"WorkerId\"", nullable = false, updatable = false)
    private AppUser worker;

    @Column(name = "\"StartDate\"", nullable = false, updatable = false)
    private LocalDate startDate;

    @Column(name = "\"EndDate\"", nullable = false, updatable = false)
    private LocalDate endDate;

    @Column(name = "\"Reason\"", nullable = false, length = 300, updatable = false)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "\"Status\"", nullable = false, length = 16)
    private LeaveRequestStatus status;

    @Column(name = "\"CreatedAt\"", nullable = false, updatable = false)
    private Instant createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"DecidedBy\"")
    private AppUser decidedBy;

    @Column(name = "\"DecidedAt\"")
    private Instant decidedAt;

    @Column(name = "\"DecisionReason\"", length = 300)
    private String decisionReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"CancelledBy\"")
    private AppUser cancelledBy;

    @Column(name = "\"CancelledAt\"")
    private Instant cancelledAt;
}
