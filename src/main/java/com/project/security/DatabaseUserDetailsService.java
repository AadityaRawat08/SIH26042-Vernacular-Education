package com.project.security;

import com.project.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

/**
 * Loads {@link UserPrincipal}s from the database for Spring Security.
 *
 * <p>Lookup key is the (lower-cased) email address, matching the login form.
 * A missing account raises {@link UsernameNotFoundException}, which
 * {@code DaoAuthenticationProvider} converts to a generic bad-credentials
 * error so attackers cannot probe for registered emails.</p>
 */
@Service
@RequiredArgsConstructor
public class DatabaseUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        String normalized = email == null ? null : email.trim().toLowerCase(Locale.ROOT);
        return userRepository.findByEmail(normalized)
                .map(UserPrincipal::new)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    /**
     * Resolves a principal by account id — used by the JWT filter to re-hydrate
     * the account behind a token's {@code sub} claim on every request.
     *
     * @return empty when no account exists for the id
     */
    @Transactional(readOnly = true)
    public Optional<UserPrincipal> loadByUserId(UUID userId) {
        return userRepository.findById(userId).map(UserPrincipal::new);
    }
}