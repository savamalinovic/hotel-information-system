# eFikas — hotelski informacioni sistem

eFikas se razvija kao interni informacioni sistem za jedan hotel. Ciljna platforma objedinjuje rezervacije, goste, naplate, apartmane, operativne zadatke, radnike, poslovne knjige, audit i analitiku za uloge `MANAGER`, `AGENT` i `OPERATIONAL_WORKER`.

Repozitorijum je nastao iz ranijeg projekta za elektronsku fiskalnu i kontrolnu administraciju. Postojeći kod i Git istorija su sačuvani, a aktuelni razvoj je usmjeren na hotelski informacioni sistem. Integracija fizičke fiskalne kase nije dio ciljnog sistema; zamjenjuje je jasno označen demo PDF račun.

## Struktura

- `Projektovanje/backend/efikas` — Spring Boot 3.5.7, Java 17, Maven i PostgreSQL backend;
- `Projektovanje/frontend/eFikas-mobile` — Expo 54, React Native i TypeScript mobilna aplikacija za agente i operativne radnike;
- `Projektovanje/database` — napomene o bazi i naslijeđeni mock podaci; autoritativne SQL migracije su uz backend u `src/main/resources/db/migration`;
- `Projektovanje/esir` — naslijeđeni ESIR materijal, van budućeg funkcionalnog opsega;
- `Dokumentacija` — naslijeđena projektna dokumentacija;

Menadžerska web aplikacija je planirana kao zasebna aplikacija, ali se ne kreira u A00.

## Preduslovi

- JDK 17 (lokalni bootstrap je provjeren i sa JDK 21 koji kompajlira target 17);
- Docker Desktop sa Compose v2 (preporučeno) ili PostgreSQL 16;
- Node.js i npm kompatibilni sa zaključanim Expo dependencyjima;
- Android Studio/emulator ili fizički uređaj za native mobile razvoj.

Stvarne lozinke, tokene, privatne ključeve i service-account fajlove ne commitovati.

Za podrazumijevani lokalni PostgreSQL iz root direktorijuma:

```powershell
docker compose up -d --wait postgres
```

Compose pravi razvojnu bazu `efikas` i testnu bazu `efikas_test`. Backend i testovi zatim automatski primjenjuju verzionisane Flyway migracije.

## Backend

Iz direktorijuma `Projektovanje/backend/efikas`:

```powershell
Copy-Item src/main/resources/application.example.properties src/main/resources/application-local.properties
./mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local
```

Provjere:

```powershell
./mvnw.cmd compile
./mvnw.cmd test
./mvnw.cmd package
```

Backend compile/package ne zahtijevaju aktivnu bazu. Testovi koriste lokalnu `efikas_test` bazu i zato zahtijevaju pokrenut PostgreSQL; Flyway inicijalizuje praznu bazu, a `ddl-auto=validate` zatim provjerava mapiranje bez mijenjanja šeme.

## Mobilna aplikacija

Iz direktorijuma `Projektovanje/frontend/eFikas-mobile`:

```powershell
Copy-Item .env.example .env.local
npm ci
npm start
```

Za lokalni API koriste se javne Expo varijable `EXPO_PUBLIC_API_SCHEME`, `EXPO_PUBLIC_API_ADDRESS` i `EXPO_PUBLIC_API_PORT`. One nisu mjesto za tajne. API sloj gradi adresu iz tih vrijednosti; za Android emulator koristi `10.0.2.2`, a za fizički uređaj LAN IP razvojnog računara.

Korisne komande:

```powershell
npm run android
npm run ios
npm run web
npm run lint
npm run typecheck
```

`npm run start:prod` koristi prenosive Expo argumente `--no-dev --minify` i radi bez POSIX-specifične sintakse za varijable okruženja.

## A00 početne provjere (2026-08-10)

Rezultati su evidentirani bez mijenjanja produkcijskog koda radi prikrivanja postojećih problema:

- `./mvnw.cmd compile` — **prolazi**;
- `./mvnw.cmd package -DskipTests` — **prolazi** i pravi executable JAR;
- `./mvnw.cmd test` — **ne prolazi**: svih 5 postojećih `@SpringBootTest` testova završava context greškom jer default/test datasource nije konfigurisan (`url` nedostaje); isti problem je postojao u ranijim Surefire izvještajima prije A00;
- `npm ci` — **prolazi** iz postojećeg lock fajla; dependency fajlovi nisu mijenjani;
- `npm run lint` — **ne prolazi**: 3 postojeće `react-hooks/rules-of-hooks` greške u `src/util/ToastConfig.tsx` i 202 upozorenja;
- `npx tsc --noEmit` — **ne prolazi**: 8 postojećih grešaka, jedna zbog obaveznog `documentType` polja u `ExpenseBookScreen.tsx` i sedam zbog nepostojećih `dateTimeOfArrival`/`dateTimeOfDeparture` polja u `apartmentsListHelper.ts`;
- mobile nema postojeću test skriptu ni pronađene test/spec fajlove.

Ovi problemi nisu nastali dokumentacionim izmjenama A00. Testno okruženje pripada A01/A02, a postojeći mobile lint/typecheck dug treba zasebno riješiti prije ili u C01.

## A01 lokalno okruženje

A01 dodaje ponovljiv PostgreSQL 16 Compose servis, odvojenu testnu bazu, sigurne backend/mobile primjere konfiguracije i konfigurabilan mobile API URL. Docker CLI nije dostupan na radnoj mašini, pa Compose runtime nije potvrđen.

## A02 migracije baze

A02 uvodi Flyway i verzionisani V1 baseline naslijeđene šeme. Prazna baza se migrira automatski, a postojeća naslijeđena baza može se baselineovati bez ponovnog DDL-a i gubitka podataka. Eksplicitna Hibernate naming strategija usklađuje JPA sa postojećim quoted imenima, dok `ddl-auto=validate` ostaje zaštitna validacija.

## A03 RBAC osnova

A03 dodaje persisted uloge `MANAGER`, `AGENT` i `OPERATIONAL_WORKER`, zatvara legacy self-registration i pristup uklonjenim fiskalnim/store rutama, te uvodi eksplicitnu deny-by-default serversku matricu. JWT identifikuje korisnika, dok se aktuelna uloga učitava iz baze pri svakom zahtjevu.

## Git tok

- `main` je stabilna početna verzija;
- `develop` je integraciona grana;
- budući rad koristi `feature/<task-id>-<naziv>` i pull request prema `develop`;
- A00 je jedini bootstrap koji se direktno commitira na `develop`.

## Originalni tim

Koristan istorijski kontekst i doprinosi originalnog tima ostaju sačuvani u Git istoriji i direktorijumu `Dokumentacija`. Originalni remote je zadržan kao `upstream`.
