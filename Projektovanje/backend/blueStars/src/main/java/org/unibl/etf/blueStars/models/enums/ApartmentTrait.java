package org.unibl.etf.blueStars.models.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Represents the traits or features that an apartment can have.
 * Each trait is associated with a descriptive key name.
 * @author markomaksimovic
 * @version 1.0
 */
@Getter
@RequiredArgsConstructor
public enum ApartmentTrait {
    WIFI("WiFi"),
    BALCONY("Balcony"),
    TV("TV"),
    PARKING("Parking");

    private final String keyName;
}
