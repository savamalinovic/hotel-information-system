package org.unibl.etf.blueStars.exceptions;

public class DuplicatePushTokenException extends RuntimeException {
    public DuplicatePushTokenException() { super("This push token already exists."); }

    public DuplicatePushTokenException(String message) {
        super(message);
    }
}
