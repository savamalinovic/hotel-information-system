package org.unibl.etf.blueStars.exceptions;

public class S3DeletionException extends RuntimeException {
    public S3DeletionException() { super("Deletion of object on S3 failed."); }

    public S3DeletionException(String message) { super(message); }

    public S3DeletionException(String message, Throwable cause) {
        super(message, cause);
    }
}
