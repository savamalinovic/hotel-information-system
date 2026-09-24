package org.unibl.etf.blueStars.models.entities;
import jakarta.persistence.*; import lombok.Getter; import lombok.Setter; import java.time.Instant;
@Getter @Setter @Entity @Table(name="task_attachment",schema="efikas")
public class TaskAttachment {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) @Column(name="\"TaskAttachmentId\"") private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="\"TaskId\"") private OperationalTask task;
 @Column(name="\"StorageKey\"",nullable=false,length=512) private String storageKey;
 @Column(name="\"OriginalName\"",nullable=false,length=255) private String originalName;
 @Column(name="\"ContentType\"",length=150) private String contentType;
 @Column(name="\"SizeBytes\"",nullable=false) private Long sizeBytes;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="\"UploadedBy\"") private AppUser uploadedBy;
 @Column(name="\"UploadedAt\"",nullable=false,updatable=false) private Instant uploadedAt;
 @PrePersist void create(){uploadedAt=Instant.now();}
}
