package com.project.language;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Data access for {@link Language} entities.
 */
public interface LanguageRepository extends JpaRepository<Language, UUID> {

    Optional<Language> findByCode(String code);

    Optional<Language> findByName(String name);

    List<Language> findAllByIsActiveTrueOrderByNameAsc();

    boolean existsByCode(String code);

    /** True when at least one language links to the given script (guards script deletion). */
    boolean existsByScripts_Id(UUID scriptId);

    /**
     * Case-insensitive search over name and native name, restricted to active
     * languages, ordered by name.
     *
     * @param query search fragment (already trimmed by the caller)
     */
    @Query("""
            select l from Language l
            where l.isActive = true
              and (lower(l.name) like lower(concat('%', :query, '%'))
                or lower(l.nativeName) like lower(concat('%', :query, '%')))
            order by l.name asc
            """)
    List<Language> searchActive(@Param("query") String query);
}