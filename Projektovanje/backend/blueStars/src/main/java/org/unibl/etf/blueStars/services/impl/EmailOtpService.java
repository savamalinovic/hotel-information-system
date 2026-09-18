package org.unibl.etf.blueStars.services.impl;


import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.unibl.etf.blueStars.services.interfaces.CacheService;
import org.unibl.etf.blueStars.services.interfaces.EmailService;
import org.unibl.etf.blueStars.services.interfaces.OtpService;
import org.unibl.etf.blueStars.util.Constants;
import org.unibl.etf.blueStars.util.OtpHelper;

@Service
public class EmailOtpService implements OtpService {
    private final CacheService otpCacheService;
    private final EmailService emailService;

    public EmailOtpService(@Qualifier(Constants.SpringQualifiers.OTP_CACHE_SERVICE) CacheService otpCacheService, EmailService emailService) {
        this.otpCacheService = otpCacheService;
        this.emailService = emailService;
    }


    @Override
    public String sendOtp(String to) {
        // 1. Generate
        String code = OtpHelper.generateRandomOtp();

        // 2. Send email before retaining the OTP.
        String message = "Greetings,\n\nYour OTP code is: " + code;
        emailService.sendEmail(to, message);

        // 3. Cache (Key is the email, Value is the code)
        otpCacheService.store(to, code);

        return "OTP email sent.";
    }


    @Override
    public boolean verifyOtp(String to, String code) {
        String storedCode = otpCacheService.get(to);
        // 4. Validate & Manual Delete
        if (storedCode != null && storedCode.equals(code)) {
            return true;
        }

        return false;
    }

    @Override
    public void deleteOtpFromStorage(String key) {
        otpCacheService.remove(key);
    }
}
