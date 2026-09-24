package org.unibl.etf.blueStars.exceptions;

public class S3UploadException extends RuntimeException {
    public S3UploadException() {
        super("A file couldn't be uploaded.");
    }

    public S3UploadException(String message) {
        super(message);
    }
}
