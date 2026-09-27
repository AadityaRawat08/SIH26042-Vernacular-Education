package com.project.security;

import com.project.user.User;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * Spring Security adapter around the {@link User} domain entity.
 *
 * <p>Placed in the {@link org.springframework.security.core.context.SecurityContext}
 * by {@link JwtAuthenticationFilter} and {@link DatabaseUserDetailsService}.
 * Controllers can inject it with {@code @AuthenticationPrincipal} to access the
 * authenticated account.</p>
 *
 * <p>{@link #isEnabled()} reflects {@link User#isActive()}, so Spring Security's
 * account-status checks automatically refuse authentication for deactivated
 * accounts.</p>
 */
@Getter
@RequiredArgsConstructor
public class UserPrincipal implements UserDetails {

    private final User user;

    /** The id of the authenticated account (JWT subject). */
    public UUID getId() {
        return user.getId();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
    }

    @Override
    public String getPassword() {
        return user.getPassword();
    }

    @Override
    public String getUsername() {
        return user.getUsername();
    }

    /** Deactivated accounts cannot authenticate. */
    @Override
    public boolean isEnabled() {
        return user.isActive();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }
}