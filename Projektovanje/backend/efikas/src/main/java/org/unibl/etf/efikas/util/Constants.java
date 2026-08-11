package org.unibl.etf.efikas.util;

public class Constants {
    public static final int BCRYPT_STRENGTH = 12;

    public static class Cache {
        public static final String OTP_CACHE_NAME = "otpCache";
        public static final int OTP_CACHE_TTL = 10;
    }

    public static class Aws {
        public static final String S3_BUCKET_IMAGES_FOLDER_PREFIX = "images/";
        public static final String TASK_ATTACHMENTS_FOLDER_PREFIX = "task-attachments/";
        public static final String DAMAGE_ATTACHMENTS_FOLDER_PREFIX = "damage-attachments/";
    }

    public static class PdfFonts {
        public static final int GLOBAL_FONT_SIZE = 8;
        public static final int FINANCIAL_TABLE_FONT_SIZE = 5;
        public static final int FINANCIAL_TABLE_HEADER_FONT_SIZE = 7;
    }

    public static class SpringQualifiers {
        public static final String INCOME_BOOK_LAYOUT_STRATEGY = "IncomeBookLayoutStrategy";
        public static final String FOREIGN_GUESTS_BOOK_LAYOUT_STRATEGY = "ForeignGuestsBookLayoutStrategy";
        public static final String DOMESTIC_GUESTS_BOOK_LAYOUT_STRATEGY = "DomesticGuestsBookLayoutStrategy";
        public static final String OTP_CACHE_SERVICE = "OtpCacheService";
    }

    public static class Expo {
        public static final String PUSH_NOTIFICATION_URI = "/--/api/v2/push/send";
    }
}
