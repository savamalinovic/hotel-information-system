package org.unibl.etf.blueStars.services.impl;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.unibl.etf.blueStars.services.interfaces.EmailService;
import software.amazon.awssdk.services.ses.SesClient;
import software.amazon.awssdk.services.ses.model.SendEmailRequest;

@Service
public class AwsEmailService implements EmailService {
    private final SesClient sesClient;
    @Value("${email.sender}")
    private String sender;

    public AwsEmailService(SesClient sesClient) {
        this.sesClient = sesClient;
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
