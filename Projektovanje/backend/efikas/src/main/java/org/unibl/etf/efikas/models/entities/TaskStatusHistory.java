package org.unibl.etf.efikas.models.entities;
import jakarta.persistence.*; import lombok.Getter; import lombok.Setter; import org.unibl.etf.efikas.models.enums.TaskStatus; import java.time.Instant;
@Getter @Setter @Entity @Table(name="task_status_history",schema="efikas")
public class TaskStatusHistory {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) @Column(name="\"TaskStatusHistoryId\"") private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="\"TaskId\"") private OperationalTask task;
 @Enumerated(EnumType.STRING) @Column(name="\"FromStatus\"") private TaskStatus fromStatus;
 @Enumerated(EnumType.STRING) @Column(name="\"ToStatus\"",nullable=false) private TaskStatus toStatus;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="\"ActorId\"") private AppUser actor;
 @Column(name="\"Reason\"",nullable=false,length=300) private String reason;
 @Column(name="\"ChangedAt\"",nullable=false,updatable=false) private Instant changedAt;
 @PrePersist void create(){changedAt=Instant.now();}
}
