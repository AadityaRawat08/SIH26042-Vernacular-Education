package com.project.language;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * A regional variant of a {@link Language} (e.g. Awadhi Hindi, Boishnabi Bengali).
 *
 * <p>Each dialect belongs to exactly one language; codes are globally unique so
 * they can serve as stable public identifiers.</p>
 */
@Entity
@Table(
        name = "dialects",
        uniqueConstraints = @UniqueConstraint(name = "uk_dialects_code", columnNames = "code"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Dialect {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    /** The language this dialect belongs to. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "language_id", nullable = false)
    private Language language;

    /** English display name, e.g. "Awadhi". */
    @Column(nullable = false, length = 80)
    private String name;

    /** Name of the dialect written natively, if known. */
    @Column(name = "native_name", length = 80)
    private String nativeName;

    /** Unique, lower-case dialect code — e.g. {@code awadhi}. */
    @Column(nullable = false, updatable = false, length = 32)
    private String code;

    @Column(length = 500)
    private String description;

    /** Geographic region where the dialect is spoken, e.g. "Awadh (UP)". */
    @Column(length = 80)
    private String region;

    /** Inactive dialects are hidden from listings. */
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}