package org.unibl.etf.blueStars;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class BlueStarsApplication {

    public static void main(String[] args) {
        SpringApplication.run(BlueStarsApplication.class, args);
    }

}
