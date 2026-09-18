package org.unibl.etf.blueStars.services.impl;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.unibl.etf.blueStars.exceptions.EmailServiceUnavailableException;
import org.unibl.etf.blueStars.services.interfaces.EmailService;

@Service
@ConditionalOnProperty(name = "ses.enabled", havingValue = "false", matchIfMissing = true)
public class DisabledEmailService implements EmailService {
    @Override
    public void sendEmail(String recipient, String message) {
        throw new EmailServiceUnavailableException();
    }
}
