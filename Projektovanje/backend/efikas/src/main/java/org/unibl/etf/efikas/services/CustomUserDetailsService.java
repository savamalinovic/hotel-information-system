package org.unibl.etf.efikas.services;

import java.util.List;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import org.unibl.etf.efikas.models.entities.AppUser;
import org.unibl.etf.efikas.repositories.AppUserRepository;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final AppUserRepository appUserRepository;

    public CustomUserDetailsService(AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
    }

    // We are going to override this method to load user by email instead of username
    // This is because we are using email as the unique identifier for our users.
    // It's not ideal, but it is what it is...
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        AppUser user = appUserRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new UsernameNotFoundException("User with email not found: " + email));

        if (user.getRole() == null || !user.isActive()) {
            throw new UsernameNotFoundException("Active user with an assigned role was not found: " + email);
        }

        List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority(user.getRole().asAuthority()));
        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPasswordHash(), authorities);
    }

}
