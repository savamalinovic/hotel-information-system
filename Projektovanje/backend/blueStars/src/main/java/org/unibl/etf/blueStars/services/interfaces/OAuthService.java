package org.unibl.etf.blueStars.services.interfaces;

import org.unibl.etf.blueStars.models.responses.AuthenticationResponse;

import java.io.IOException;
import java.security.GeneralSecurityException;

public interface OAuthService {
    /**
     * Authenticated a user through OAuth mechanism.
     * @param idTokenString The Token ID to authenticate a user after OAuth.
     * */
    AuthenticationResponse authenticateOAuth(String idTokenString) throws GeneralSecurityException, IOException;

}
