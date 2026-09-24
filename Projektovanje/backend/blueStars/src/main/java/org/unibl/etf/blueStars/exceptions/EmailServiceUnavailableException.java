package org.unibl.etf.blueStars.exceptions;

public class EmailServiceUnavailableException extends RuntimeException {
    public EmailServiceUnavailableException() {
        super("Email delivery is not configured.");
    }
}
