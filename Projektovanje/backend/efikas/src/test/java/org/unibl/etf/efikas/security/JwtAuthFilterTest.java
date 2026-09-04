package org.unibl.etf.efikas.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.unibl.etf.efikas.configs.ObjectMapperConfig;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class JwtAuthFilterTest {
    private static final String PATH = "/api/v1/apartments";
    private static final String SIGNING_SECRET = "test-jwt-secret-with-at-least-thirty-two-characters";

    private final ObjectMapper objectMapper = new ObjectMapperConfig().objectMapper();

    @Test
    void missingAuthorizationHeaderContinuesToTheSecurityEntryPoint() throws Exception {
        MockHttpServletRequest request = requestWithoutAuthorization();
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain filterChain = new MockFilterChain();

        filter(mock(UserDetailsService.class)).doFilter(request, response, filterChain);

        assertThat(filterChain.getRequest()).isSameAs(request);
        assertThat(response.getContentAsString()).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"Bearer ", "Bearer    ", "Bearer \t"})
    void emptyOrBlankBearerTokenUsesUnauthorizedEnvelope(String authorization) throws Exception {
        assertUnauthorized(authorization, "");
    }

    @Test
    void malformedTokenUsesUnauthorizedEnvelopeWithoutParserDetails() throws Exception {
        assertUnauthorized("Bearer not-a-jwt", "not-a-jwt");
    }

    @Test
    void tamperedTokenUsesUnauthorizedEnvelopeWithoutParserDetails() throws Exception {
        JwtUtil differentSigner = new JwtUtil("different-test-jwt-secret-with-at-least-thirty-two-characters", 60_000);

        assertUnauthorized("Bearer " + differentSigner.generateToken("agent@example.invalid"), "signature");
    }

    @Test
    void expiredTokenUsesUnauthorizedEnvelopeWithoutParserDetails() throws Exception {
        JwtUtil expiredSigner = new JwtUtil(SIGNING_SECRET, -1);

        assertUnauthorized("Bearer " + expiredSigner.generateToken("agent@example.invalid"), "expired");
    }

    @Test
    void unknownUserUsesUnauthorizedEnvelope() throws Exception {
        UserDetailsService userDetailsService = mock(UserDetailsService.class);
        when(userDetailsService.loadUserByUsername("missing@example.invalid"))
                .thenThrow(new UsernameNotFoundException("missing@example.invalid"));

        assertUnauthorized(userDetailsService, "Bearer " + jwtUtil().generateToken("missing@example.invalid"), "missing@example.invalid");
    }

    @Test
    void validTokenAuthenticatesAndContinuesTheFilterChain() throws Exception {
        UserDetailsService userDetailsService = mock(UserDetailsService.class);
        UserDetails user = User.withUsername("agent@example.invalid")
                .password("not-used")
                .authorities("ROLE_AGENT")
                .build();
        when(userDetailsService.loadUserByUsername(user.getUsername())).thenReturn(user);
        MockHttpServletRequest request = request("Bearer " + jwtUtil().generateToken(user.getUsername()));
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain filterChain = new MockFilterChain();

        filter(userDetailsService).doFilter(request, response, filterChain);

        assertThat(filterChain.getRequest()).isSameAs(request);
    }

    private void assertUnauthorized(String authorization, String forbiddenDetail) throws Exception {
        assertUnauthorized(mock(UserDetailsService.class), authorization, forbiddenDetail);
    }

    private void assertUnauthorized(
            UserDetailsService userDetailsService,
            String authorization,
            String forbiddenDetail
    ) throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter(userDetailsService).doFilter(request(authorization), response, new MockFilterChain());

        JsonNode body = objectMapper.readTree(response.getContentAsByteArray());
        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentType()).startsWith(MediaType.APPLICATION_JSON_VALUE);
        assertThat(body.path("status").asInt()).isEqualTo(401);
        assertThat(body.path("code").asText()).isEqualTo("AUTHENTICATION_REQUIRED");
        assertThat(body.path("path").asText()).isEqualTo(PATH);
        if (!forbiddenDetail.isEmpty()) {
            assertThat(response.getContentAsString()).doesNotContain(forbiddenDetail);
        }
    }

    private JwtAuthFilter filter(UserDetailsService userDetailsService) {
        return new JwtAuthFilter(
                jwtUtil(),
                userDetailsService,
                new ApiErrorResponseWriter(objectMapper));
    }

    private JwtUtil jwtUtil() {
        return new JwtUtil(SIGNING_SECRET, 60_000);
    }

    private MockHttpServletRequest request(String authorization) {
        MockHttpServletRequest request = requestWithoutAuthorization();
        request.addHeader("Authorization", authorization);
        return request;
    }

    private MockHttpServletRequest requestWithoutAuthorization() {
        return new MockHttpServletRequest("GET", PATH);
    }
}
