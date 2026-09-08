package org.unibl.etf.blueStars.repositories; // koristi isti paket kao tvoja glavna aplikacija

import org.unibl.etf.blueStars.models.entities.AppUser;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

@SpringBootTest
public class AppUserRepositoryTest {

    @Autowired
    private AppUserRepository appUserRepository;

    @Test
    void shouldPrintAllUsers() {
        List<AppUser> users = appUserRepository.findAll();

        if (users.isEmpty()) {
            System.out.println("⚠️  Tabela 'user' je prazna.");
        } else {
            System.out.println("✅ Svi redovi iz tabele 'user':");
            users.forEach(u -> System.out.println(
                    "ID: " + u.getUserId() +
                            ", Name: " + u.getName() +
                            ", Surname: " + u.getSurname() +
                            ", Email: " + u.getEmail()
            ));
        }
    }
}
