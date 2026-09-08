package org.unibl.etf.blueStars.configs;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.unibl.etf.blueStars.util.Constants;

import java.util.concurrent.TimeUnit;

@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager(Constants.Cache.OTP_CACHE_NAME);
        cacheManager.setCaffeine(
                Caffeine.newBuilder()
                        .expireAfterWrite(Constants.Cache.OTP_CACHE_TTL, TimeUnit.MINUTES)
                        .maximumSize(100) // Protects RAM from filling up
        );
        return cacheManager;
    }
}
