package com.project.dictionary;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

/**
 * Data access for {@link DictionaryEntry} entities.
 *
 * <p>All queries are server-side and paginated &mdash; the dictionary is never
 * loaded into memory in full. Word matching is performed on the pre-normalized
 * {@code normalized_word} column so it is case-insensitive by construction.</p>
 */
public interface DictionaryRepository extends JpaRepository<DictionaryEntry, UUID> {

    /** True when an entry for the given language already has this exact normalized word. */
    boolean existsByLanguage_CodeAndNormalizedWord(String languageCode, String normalizedWord);

    /**
     * Same as {@link #existsByLanguage_CodeAndNormalizedWord} but excludes the
     * entry identified by {@code excludedId} &mdash; used by updates so an entry
     * does not collide with itself.
     */
    boolean existsByLanguage_CodeAndNormalizedWordAndIdNot(String languageCode, String normalizedWord, UUID excludedId);

    /**
     * Exact (case-insensitive by construction) lookup of an entry by language
     * code and caller-normalized word. Used by the learning module to resolve a
     * practiced word back to its dictionary entry.
     */
    Optional<DictionaryEntry> findByLanguage_CodeAndNormalizedWord(String languageCode, String normalizedWord);

    /**
     * All entries for a language, paginated. The sort order is supplied by the
     * caller's {@link Pageable}.
     */
    Page<DictionaryEntry> findByLanguage_Code(String languageCode, Pageable pageable);

    /**
     * Language-scoped word search. {@code wordNorm} is the caller-normalized
     * (lower-cased/trimmed) search term; rows whose {@code normalized_word}
     * contains it are returned. Relevance ordering puts an exact (case-insensitive)
     * match first, then alphabetical by word, then newest first.
     */
    @Query("""
            select d from DictionaryEntry d
            where d.language.code = :languageCode
              and d.normalizedWord like concat('%', :wordNorm, '%')
            order by (case when d.normalizedWord = :wordNorm then 0 else 1 end),
                     d.word asc,
                     d.createdAt desc
            """)
    Page<DictionaryEntry> searchByLanguageAndWord(@Param("languageCode") String languageCode,
                                                  @Param("wordNorm") String wordNorm,
                                                  Pageable pageable);
}
