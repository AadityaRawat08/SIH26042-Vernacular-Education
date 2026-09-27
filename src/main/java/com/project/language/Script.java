package com.project.language;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * A writing system (script) that languages can support — e.g. Devanagari,
 * Latin, Bengali, Tamil.
 *
 * <p>Scripts are a global registry; {@link Language} links to them through the
 * {@code languages_scripts} join table (a language can support several scripts,
 * and a script can be shared by many languages — Devanagari covers Hindi,
 * Marathi, Sanskrit, …).</p>
 *
 * <p>{@link #code} follows ISO 15924 (four letters, e.g. {@code Deva},
 * {@code Latn}).</p>
 */
@Entity
@Table(
        name = "scripts",
        uniqueConstraints = @UniqueConstraint(name = "uk_scripts_code", columnNames = "code"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Script {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    /** English display name, e.g. "Devanagari". */
    @Column(nullable = false, length = 80)
    private String name;

    /** ISO 15924 code — e.g. {@code Deva}, {@code Latn}. */
    @Column(nullable = false, updatable = false, length = 8)
    private String code;

    @Column(length = 500)
    private String description;
}