package org.unibl.etf.blueStars.models.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "notification_push_token", schema = "efikas")
public class NotificationPushToken {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "\"TokenId\"", nullable = false)
    private Integer id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.RESTRICT)
    @JoinColumn(name = "\"UserId\"", nullable = false)
    private AppUser user;

    @Size(max = 150)
    @NotNull
    @Column(name = "\"PushToken\"", nullable = false, length = 150)
    private String pushToken;

    @Size(max = 15)
    @NotNull
    @Column(name = "\"Platform\"", nullable = false, length = 15)
    private String platform;

    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "\"LastUsedAt\"")
    private Instant lastUsedAt;

    @ColumnDefault("CURRENT_TIMESTAMP")
    @CreationTimestamp
    @Column(name = "\"CreatedAt\"")
    private Instant createdAt;

    @NotNull
    @ColumnDefault("true")
    @Column(name = "\"Enabled\"", nullable = false)
    private Boolean enabled;


}