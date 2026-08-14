package org.unibl.etf.efikas.util;

public final class PhoneNumbers {
    private PhoneNumbers() {
    }

    public static String normalize(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.isBlank()) {
            return null;
        }

        String trimmed = phoneNumber.trim();
        String digits = trimmed.replaceAll("[^0-9]", "");
        if (trimmed.startsWith("+")) {
            return "+" + digits;
        }
        if (digits.startsWith("0")) {
            return "+387" + digits.substring(1);
        }
        if (digits.startsWith("387")) {
            return "+" + digits;
        }
        throw new IllegalArgumentException("Phone number must use an international or Bosnian local prefix.");
    }
}
