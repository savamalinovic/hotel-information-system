package org.unibl.etf.blueStars.exceptions;

public class StoreExistsException extends RuntimeException{
    public StoreExistsException() { super("A store already exists for this user."); }

    public StoreExistsException(String message) {
        super(message);
    }
}
