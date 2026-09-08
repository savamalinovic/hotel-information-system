package org.unibl.etf.blueStars.services.impl;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.unibl.etf.blueStars.models.dto.UserDTO;
import org.unibl.etf.blueStars.models.entities.AppUser;
import org.unibl.etf.blueStars.models.responses.AuthenticationResponse;
import org.unibl.etf.blueStars.exceptions.InvalidCredentialsException;
import org.unibl.etf.blueStars.repositories.AppUserRepository;
import org.unibl.etf.blueStars.security.JwtUtil;
import org.unibl.etf.blueStars.services.interfaces.OAuthService;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;

@Service
public class GoogleOAuthService implements OAuthService {
    private final JwtUtil jwtUtil;
    private final GoogleIdTokenVerifier verifier;
    private final AppUserRepository appUserRepository;

    public GoogleOAuthService(
            JwtUtil jwtUtil,
            AppUserRepository appUserRepository,
            @Value("${oauth2.client.registration.google.client-id}") String clientId
    ) {
        this.jwtUtil = jwtUtil;
        this.appUserRepository = appUserRepository;
        this.verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), new GsonFactory())
                .setAudience(Collections.singletonList(clientId))
                .build();
    }


    @Override
    public AuthenticationResponse authenticateOAuth(String idTokenString) throws GeneralSecurityException, IOException {
        GoogleIdToken.Payload payload = verify(idTokenString);

        if (payload == null || payload.getEmail() == null) {
            throw new RuntimeException("Invalid Google token");
        }

        String email = payload.getEmail();
        AppUser persistedUser = appUserRepository.findByEmailIgnoreCase(email)
                .filter(AppUser::isActive)
                .orElseThrow(InvalidCredentialsException::new);

        UserDTO user = UserDTO.builder()
                .name(persistedUser.getName())
                .surname(persistedUser.getSurname())
                .email(persistedUser.getEmail())
                .build();
        String accessToken = jwtUtil.generateToken(persistedUser.getEmail());

        return new AuthenticationResponse(user, accessToken);
    }

    private GoogleIdToken.Payload verify(String idTokenString) throws GeneralSecurityException, IOException {
        GoogleIdToken idToken = verifier.verify(idTokenString);
        if (idToken != null) {
            return idToken.getPayload();
        }

        return null;
    }
}
