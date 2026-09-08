package org.unibl.etf.blueStars.models.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum MobilePlatform {

    ANDROID("android"),
    IOS("ios");

    private final String value;
}
