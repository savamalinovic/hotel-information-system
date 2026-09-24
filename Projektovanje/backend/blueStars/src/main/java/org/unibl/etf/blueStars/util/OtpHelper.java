package org.unibl.etf.blueStars.util;

import java.security.SecureRandom;

public class OtpHelper {
    public static String generateRandomOtp() {
        SecureRandom secureRandom = new SecureRandom();
        // Get int between 0 (inclusive) and 1,000,000 (exclusive)
        int min = 100000;
        int max = 999999;
        int randomInteger = secureRandom.nextInt(min, max + 1);

        return String.format("%06d", randomInteger);
    }
}
