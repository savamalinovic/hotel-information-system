package org.unibl.etf.efikas.configs;

import lombok.AllArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.unibl.etf.efikas.models.enums.UserRole;
import org.unibl.etf.efikas.security.JwtAuthFilter;
import org.unibl.etf.efikas.security.JwtAccessDeniedHandler;
import org.unibl.etf.efikas.security.JwtAuthenticationEntryPoint;
import org.unibl.etf.efikas.util.Constants;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@AllArgsConstructor
public class SecurityConfig implements WebMvcConfigurer {

    private final JwtAuthFilter jwtAuthFilter;
    private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;
    private final JwtAccessDeniedHandler jwtAccessDeniedHandler;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(Constants.BCRYPT_STRENGTH);
    }

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        registry.addViewController("/").setViewName("forward:/index.html");
        registry.addViewController("/login").setViewName("forward:/index.html");
        registry.addViewController("/register").setViewName("forward:/index.html");
        registry.addViewController("/activities").setViewName("forward:/index.html");
        registry.addViewController("/settings").setViewName("forward:/index.html");
        registry.addViewController("/logout").setViewName("forward:/index.html");
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        // Browser shell and public infrastructure endpoints.
                        .requestMatchers(
                                "/", "/login", "/register", "/activities", "/settings", "/logout",
                                "/index.html", "/favicon.ico", "/manifest.json", "/static/**", "/assets/**",
                                "/js/**", "/css/**", "/images/**", "/actuator/health", "/error",
                                "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html")
                        .permitAll()

                        // Authentication and account recovery entry points.
                        .requestMatchers(HttpMethod.POST,
                                "/api/v1/users/login", "/api/v1/auth/login", "/api/v1/auth/google/login",
                                "/api/v1/auth/otp/request", "/api/v1/auth/otp/verify")
                        .permitAll()
                        .requestMatchers(HttpMethod.PUT, "/api/v1/auth/reset-password")
                        .permitAll()

                        // Removed product capabilities remain unreachable.
                        .requestMatchers("/api/v1/users/register", "/api/v1/auth/register",
                                "/api/v1/cash-registers/**", "/api/v1/users/register/store",
                                "/api/v1/users/me/store", "/api/v1/apartments/*/expenses/**")
                        .denyAll()
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/users/me")
                        .denyAll()

                        // Manager-only read models and privileged operations.
                        .requestMatchers(HttpMethod.GET, "/api/v1/books/**")
                        .hasRole(UserRole.MANAGER.name())
                        .requestMatchers("/api/v1/books/**")
                        .denyAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/audit-logs/**")
                        .hasRole(UserRole.MANAGER.name())
                        .requestMatchers("/api/v1/audit-logs/**")
                        .denyAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/analytics/**")
                        .hasRole(UserRole.MANAGER.name())
                        .requestMatchers("/api/v1/analytics/**")
                        .denyAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/notifications/send")
                        .hasRole(UserRole.MANAGER.name())

                        // Singleton hotel profile and stable specialization catalog.
                        .requestMatchers(HttpMethod.GET, "/api/v1/hotel-profile", "/api/v1/specializations")
                        .hasAnyRole(UserRole.MANAGER.name(), UserRole.AGENT.name(), UserRole.OPERATIONAL_WORKER.name())
                        .requestMatchers(HttpMethod.PUT, "/api/v1/hotel-profile")
                        .hasRole(UserRole.MANAGER.name())
                        .requestMatchers("/api/v1/hotel-profile/**", "/api/v1/specializations/**")
                        .denyAll()

                        // Specific nested apartment routes must precede the apartment rules.
                        .requestMatchers(HttpMethod.POST, "/api/v1/reservations/*/payments",
                                "/api/v1/reservations/*/payments/*/corrections",
                                "/api/v1/reservations/*/payments/*/reversal")
                        .hasRole(UserRole.AGENT.name())
                        .requestMatchers(HttpMethod.POST, "/api/v1/reservations/*/guests",
                                "/api/v1/reservations/*/check-in", "/api/v1/reservations/*/check-in/claim",
                                "/api/v1/reservations/*/check-out", "/api/v1/reservations/*/demo-receipt")
                        .hasRole(UserRole.AGENT.name())
                        .requestMatchers(HttpMethod.PUT, "/api/v1/reservations/*/guests/*",
                                "/api/v1/reservations/*/check-in/claim")
                        .hasRole(UserRole.AGENT.name())
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/reservations/*/guests/*",
                                "/api/v1/reservations/*/check-in/claim")
                        .hasRole(UserRole.AGENT.name())
                        .requestMatchers("/api/v1/reservations/**", "/api/v1/apartments/*/reservations/**")
                        .hasAnyRole(UserRole.MANAGER.name(), UserRole.AGENT.name())
                        .requestMatchers(HttpMethod.GET, "/api/v1/guests/**")
                        .hasAnyRole(UserRole.MANAGER.name(), UserRole.AGENT.name())
                        .requestMatchers("/api/v1/guests/**")
                        .denyAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/workforce/availability")
                        .hasRole(UserRole.MANAGER.name())
                        .requestMatchers("/api/v1/workforce/leave-requests/**")
                        .hasRole(UserRole.MANAGER.name())
                        .requestMatchers("/api/v1/workforce/me/**")
                        .hasRole(UserRole.OPERATIONAL_WORKER.name())
                        .requestMatchers("/api/v1/workforce/**")
                        .denyAll()
                        // Hotel-level operational expenses; legacy apartment expenses stay closed.
                        .requestMatchers(HttpMethod.GET, "/api/v1/expense-categories/**", "/api/v1/expenses/**")
                        .hasAnyRole(UserRole.MANAGER.name(), UserRole.AGENT.name())
                        .requestMatchers(HttpMethod.POST, "/api/v1/expenses/*/void")
                        .hasRole(UserRole.MANAGER.name())
                        .requestMatchers(HttpMethod.POST, "/api/v1/expenses")
                        .hasAnyRole(UserRole.MANAGER.name(), UserRole.AGENT.name())
                        .requestMatchers("/api/v1/expense-categories/**")
                        .hasRole(UserRole.MANAGER.name())
                        .requestMatchers("/api/v1/expenses/**")
                        .denyAll()
                        // Stable operational task API; workers claim and execute their own work.
                        .requestMatchers(HttpMethod.POST, "/api/v1/tasks/*/claim", "/api/v1/tasks/*/start",
                                "/api/v1/tasks/*/block", "/api/v1/tasks/*/resume", "/api/v1/tasks/*/complete")
                        .hasRole(UserRole.OPERATIONAL_WORKER.name())
                        .requestMatchers(HttpMethod.POST, "/api/v1/tasks/*/cancel")
                        .hasAnyRole(UserRole.MANAGER.name(), UserRole.AGENT.name())
                        .requestMatchers(HttpMethod.POST, "/api/v1/tasks/*/attachments")
                        .hasAnyRole(UserRole.MANAGER.name(), UserRole.AGENT.name(), UserRole.OPERATIONAL_WORKER.name())
                        .requestMatchers(HttpMethod.POST, "/api/v1/tasks")
                        .hasAnyRole(UserRole.MANAGER.name(), UserRole.AGENT.name())
                        .requestMatchers(HttpMethod.GET, "/api/v1/tasks/available")
                        .hasRole(UserRole.OPERATIONAL_WORKER.name())
                        .requestMatchers(HttpMethod.GET, "/api/v1/tasks/mine")
                        .hasRole(UserRole.OPERATIONAL_WORKER.name())
                        .requestMatchers(HttpMethod.GET, "/api/v1/tasks")
                        .hasAnyRole(UserRole.MANAGER.name(), UserRole.AGENT.name())
                        .requestMatchers(HttpMethod.GET, "/api/v1/tasks/**")
                        .hasAnyRole(UserRole.MANAGER.name(), UserRole.AGENT.name(), UserRole.OPERATIONAL_WORKER.name())
                        .requestMatchers("/api/v1/tasks/**")
                        .denyAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/apartments/*/damages/**")
                        .hasAnyRole(UserRole.MANAGER.name(), UserRole.AGENT.name(), UserRole.OPERATIONAL_WORKER.name())
                        .requestMatchers(HttpMethod.POST, "/api/v1/apartments/*/damages/*/attachments")
                        .hasAnyRole(UserRole.MANAGER.name(), UserRole.AGENT.name(), UserRole.OPERATIONAL_WORKER.name())
                        .requestMatchers(HttpMethod.POST, "/api/v1/apartments/*/damages")
                        .hasAnyRole(UserRole.MANAGER.name(), UserRole.AGENT.name())
                        .requestMatchers(HttpMethod.PUT, "/api/v1/apartments/*/damages/*")
                        .hasRole(UserRole.MANAGER.name())
                        .requestMatchers("/api/v1/apartments/*/damages/**")
                        .denyAll()
                        .requestMatchers("/api/v1/apartments/*/tasks/**")
                        .denyAll()

                        // Catalog reads support reception and operational work; mutations remain managerial.
                        .requestMatchers(HttpMethod.GET, "/api/v1/apartment-types/**", "/api/v1/apartments/**",
                                "/api/v1/apartment-traits/**")
                        .hasAnyRole(UserRole.MANAGER.name(), UserRole.AGENT.name(), UserRole.OPERATIONAL_WORKER.name())
                        .requestMatchers("/api/v1/apartment-types/**", "/api/v1/apartments/**")
                        .hasRole(UserRole.MANAGER.name())

                        // Self-service and shared authenticated infrastructure.
                        .requestMatchers("/api/v1/users/me", "/api/v1/notifications/**",
                                "/api/v1/settings/register-error")
                        .hasAnyRole(UserRole.MANAGER.name(), UserRole.AGENT.name(), UserRole.OPERATIONAL_WORKER.name())
                        .requestMatchers("/api/v1/users/**")
                        .hasRole(UserRole.MANAGER.name())
                        .requestMatchers("/api/v1/s3/**")
                        .hasAnyRole(UserRole.MANAGER.name(), UserRole.AGENT.name())

                        // New endpoints are inaccessible until explicitly added to this matrix.
                        .anyRequest().denyAll())
                .exceptionHandling(eh -> eh
                        .authenticationEntryPoint(jwtAuthenticationEntryPoint)
                        .accessDeniedHandler(jwtAccessDeniedHandler))
                .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
