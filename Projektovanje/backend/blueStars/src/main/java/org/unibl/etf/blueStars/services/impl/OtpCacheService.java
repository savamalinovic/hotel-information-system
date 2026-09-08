package org.unibl.etf.blueStars.services.impl;

import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.unibl.etf.blueStars.services.interfaces.CacheService;
import org.unibl.etf.blueStars.util.Constants;

@Service(Constants.SpringQualifiers.OTP_CACHE_SERVICE)
public class OtpCacheService implements CacheService {
    private final Cache cache;

    public OtpCacheService(CacheManager cacheManager) {
        this.cache = cacheManager.getCache(Constants.Cache.OTP_CACHE_NAME);
    }

    @Override
    public void store(String key, String otp) {
        if(this.cache != null) {
            System.out.println("STORING <KEY-VALUE> IN CACHE: " + key + "<->" + otp);
            this.cache.put(key, otp);
        }
    }

    @Override
    public String get(String key) {
        if(this.cache != null && this.cache.get(key) != null) {
            System.out.println("READING KEY FROM CACHE: " + key);
            return this.cache.get(key).get().toString();
        }
        return "";
    }

    @Override
    public void remove(String key) {
        if(this.cache != null) {
            System.out.println("DELETING KEY FROM CACHE: " + key);
            this.cache.evictIfPresent(key);
        }
    }
}
