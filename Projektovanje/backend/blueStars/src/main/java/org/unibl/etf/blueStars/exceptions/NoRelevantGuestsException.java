package org.unibl.etf.blueStars.exceptions;

public class NoRelevantGuestsException extends RuntimeException {
    public NoRelevantGuestsException() { super("No guests were found."); }

    public NoRelevantGuestsException(String message) { super(message); }
}
