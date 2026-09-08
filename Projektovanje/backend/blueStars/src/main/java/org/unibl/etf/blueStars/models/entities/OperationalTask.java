package org.unibl.etf.blueStars.models.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.unibl.etf.blueStars.models.enums.*;
import java.time.Instant;

@Getter @Setter @Entity
@Table(name="operational_task", schema="efikas")
public class OperationalTask {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) @Column(name="\"TaskId\"") private Long taskId;
 @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="\"SpecializationId\"") private Specialization specialization;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="\"ApartmentId\"") private Apartment apartment;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="\"ReservationId\"") private Reservation reservation;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="\"AssignedWorkerId\"") private AppUser assignedWorker;
 @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="\"CreatedBy\"") private AppUser createdBy;
 @Column(name="\"Title\"",nullable=false,length=120) private String title;
 @Column(name="\"Description\"",nullable=false,length=1000) private String description;
 @Enumerated(EnumType.STRING) @Column(name="\"Priority\"",nullable=false,length=16) private TaskPriority priority=TaskPriority.NORMAL;
 @Enumerated(EnumType.STRING) @Column(name="\"Status\"",nullable=false,length=24) private TaskStatus status=TaskStatus.NEW;
 @Enumerated(EnumType.STRING) @Column(name="\"Source\"",nullable=false,length=24) private TaskSource source=TaskSource.MANUAL;
 @Column(name="\"CreatedAt\"",nullable=false,updatable=false) private Instant createdAt;
 @Column(name="\"UpdatedAt\"",nullable=false) private Instant updatedAt;
 @Version @Column(name="\"Version\"",nullable=false) private Long version;
 @PrePersist void create(){createdAt=updatedAt=Instant.now();}
 @PreUpdate void update(){updatedAt=Instant.now();}
}
