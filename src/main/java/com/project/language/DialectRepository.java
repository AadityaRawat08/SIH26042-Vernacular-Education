package com.project.language;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Data access for {@link Dialect} entities.
 */
public interface DialectRepository extends JpaRepository<Dialect, UUID> {

    List<Dialect> findByLanguageIdOrderByNameAsc(UUID languageId);

    Optional<Dialect> findByCode(String code);

    boolean existsByCode(String code);

    boolean existsByLanguageId(UUID languageId);
}