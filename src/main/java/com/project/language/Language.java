package com.project.language;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
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
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

/**
 * A language supported by the platform (e.g. Hindi, Tamil, English).
 *
 * <p>Relationships:</p>
 * <ul>
 *   <li>{@code 1 : N} {@link Dialect} — regional variants of this language.</li>
 *   <li>{@code N : M} {@link Script} — writing systems this language can be
 *       rendered in (e.g. Hindi → Devanagari, Urdu → Arabic).</li>
 * </ul>
 *
 * <p>{@link #code} is the standard identifier (ISO 639-1 two-letter code where
 * one exists, otherwise ISO 639-2/3). It is unique, lower-case, and is also the
 * value users reference in {@code users.preferred_language}.</p>
 */
@Entity
@Table(
        name = "languages",
        uniqueConstraints = @UniqueConstraint(name = "uk_languages_code", columnNames = "code"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Language {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    /** English display name, e.g. "Hindi". */
    @Column(nullable = false, length = 80)
    private String name;

    /** Name of the language written in the language itself, e.g. "हिन्दी". */
    @Column(name = "native_name", nullable = false, length = 80)
    private String nativeName;

    /** Standard language code (ISO 639-1/2-3), unique, lower-case — e.g. {@code hi}. */
    @Column(nullable = false, updatable = false, length = 8)
    private String code;

    @Column(length = 500)
    private String description;

    /** Inactive languages are hidden from public listings but keep their history. */
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    /** Writing systems supported by this language. */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "languages_scripts",
            joinColumns = @JoinColumn(name = "language_id"),
            inverseJoinColumns = @JoinColumn(name = "script_id"))
    @Builder.Default
    private Set<Script> scripts = new LinkedHashSet<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}