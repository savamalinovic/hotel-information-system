package org.unibl.etf.blueStars.services.impl;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.unibl.etf.blueStars.services.interfaces.EmailService;
import software.amazon.awssdk.services.ses.SesClient;
import software.amazon.awssdk.services.ses.model.SendEmailRequest;

@Service
@ConditionalOnProperty(name = "ses.enabled", havingValue = "true")
public class AwsEmailService implements EmailService {
    private final SesClient sesClient;
    private final String sender;

    public AwsEmailService(SesClient sesClient, @Value("${email.sender}") String sender) {
        this.sesClient = sesClient;
        if (sender == null || sender.isBlank()) {
            throw new IllegalStateException("Email sender must be configured when SES is enabled.");
        }
        this.sender = sender;
    }

    @Override
    public void sendEmail(String recipient, String message) {
        SendEmailRequest request = SendEmailRequest.builder()
                .destination(d -> d.toAddresses(recipient))
                .message(m -> m
                        .subject(s -> s.data("BlueStars - Your Login Code"))
                        .body(b -> b.text(t -> t.data(message))))
                .source(sender)
                .build();

        sesClient.sendEmail(request);
    }
}
