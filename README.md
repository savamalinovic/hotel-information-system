# eFikas ? hotelski informacioni sistem

eFikas se razvija kao interni informacioni sistem za jedan hotel. Ciljna platforma objedinjuje rezervacije, goste, naplate, apartmane, operativne zadatke, radnike, poslovne knjige, audit i analitiku za uloge `MANAGER`, `AGENT` i `OPERATIONAL_WORKER`.

Repozitorijum je nastao iz ranijeg projekta za elektronsku fiskalnu i kontrolnu administraciju. Postoje?i kod i Git istorija su sa?uvani, a aktuelni razvoj je usmjeren na hotelski informacioni sistem. Integracija fizi?ke fiskalne kase nije dio ciljnog sistema; zamjenjuje je jasno ozna?en demo PDF ra?un.

## Struktura

- `Projektovanje/backend/efikas` ? Spring Boot 3.5.7, Java 17, Maven i PostgreSQL backend;
- `Projektovanje/frontend/eFikas-mobile` ? Expo 54, React Native i TypeScript mobilna aplikacija za agente i operativne radnike;
- `Projektovanje/database` ? napomene o bazi i naslije?eni mock podaci; autoritativne SQL migracije su uz backend u `src/main/resources/db/migration`;
- `Projektovanje/esir` ? naslije?eni ESIR materijal, van budu?eg funkcionalnog opsega;
- `Dokumentacija` ? naslije?ena projektna dokumentacija;

Menad?erska web aplikacija je planirana kao zasebna aplikacija, ali se ne kreira u A00.

## Preduslovi

- JDK 17 (lokalni bootstrap je provjeren i sa JDK 21 koji kompajlira target 17);
- Docker Desktop sa Compose v2 (preporu?eno) ili PostgreSQL 16;
- Node.js i npm kompatibilni sa zaklju?anim Expo dependencyjima;
- Android Studio/emulator ili fizi?ki ure?aj za native mobile razvoj.

Stvarne lozinke, tokene, privatne klju?eve i service-account fajlove ne commitovati.

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

Backend compile/package ne zahtijevaju aktivnu bazu. Testovi koriste lokalnu `efikas_test` bazu i zato zahtijevaju pokrenut PostgreSQL; Flyway inicijalizuje praznu bazu, a `ddl-auto=validate` zatim provjerava mapiranje bez mijenjanja ?eme.

## Mobilna aplikacija

Iz direktorijuma `Projektovanje/frontend/eFikas-mobile`:

```powershell
Copy-Item .env.example .env.local
npm ci
npm start
```

Za lokalni API koriste se javne Expo varijable `EXPO_PUBLIC_API_SCHEME`, `EXPO_PUBLIC_API_ADDRESS` i `EXPO_PUBLIC_API_PORT`. One nisu mjesto za tajne. API sloj gradi adresu iz tih vrijednosti; za Android emulator koristi `10.0.2.2`, a za fizi?ki ure?aj LAN IP razvojnog ra?unara.

Korisne komande:

```powershell
npm run android
npm run ios
npm run web
npm run lint
npm run typecheck
```

`npm run start:prod` koristi prenosive Expo argumente `--no-dev --minify` i radi bez POSIX-specifi?ne sintakse za varijable okru?enja.

## A00 po?etne provjere (2026-08-10)

Rezultati su evidentirani bez mijenjanja produkcijskog koda radi prikrivanja postoje?ih problema:

- `./mvnw.cmd compile` ? **prolazi**;
- `./mvnw.cmd package -DskipTests` ? **prolazi** i pravi executable JAR;
- `./mvnw.cmd test` ? **ne prolazi**: svih 5 postoje?ih `@SpringBootTest` testova zavr?ava context gre?kom jer default/test datasource nije konfigurisan (`url` nedostaje); isti problem je postojao u ranijim Surefire izvje?tajima prije A00;
- `npm ci` ? **prolazi** iz postoje?eg lock fajla; dependency fajlovi nisu mijenjani;
- `npm run lint` ? **ne prolazi**: 3 postoje?e `react-hooks/rules-of-hooks` gre?ke u `src/util/ToastConfig.tsx` i 202 upozorenja;
- `npx tsc --noEmit` ? **ne prolazi**: 8 postoje?ih gre?aka, jedna zbog obaveznog `documentType` polja u `ExpenseBookScreen.tsx` i sedam zbog nepostoje?ih `dateTimeOfArrival`/`dateTimeOfDeparture` polja u `apartmentsListHelper.ts`;
- mobile nema postoje?u test skriptu ni prona?ene test/spec fajlove.

Ovi problemi nisu nastali dokumentacionim izmjenama A00. Testno okru?enje pripada A01/A02, a postoje?i mobile lint/typecheck dug treba zasebno rije?iti prije ili u C01.

## A01 lokalno okru?enje

A01 dodaje ponovljiv PostgreSQL 16 Compose servis, odvojenu testnu bazu, sigurne backend/mobile primjere konfiguracije i konfigurabilan mobile API URL. Docker CLI nije dostupan na radnoj ma?ini, pa Compose runtime nije potvr?en.

## A02 migracije baze

A02 uvodi Flyway i verzionisani V1 baseline naslije?ene ?eme. Prazna baza se migrira automatski, a postoje?a naslije?ena baza mo?e se baselineovati bez ponovnog DDL-a i gubitka podataka. Eksplicitna Hibernate naming strategija uskla?uje JPA sa postoje?im quoted imenima, dok `ddl-auto=validate` ostaje za?titna validacija.

## A03 RBAC osnova

A03 dodaje persisted uloge `MANAGER`, `AGENT` i `OPERATIONAL_WORKER`, zatvara legacy self-registration i pristup uklonjenim fiskalnim/store rutama, te uvodi eksplicitnu deny-by-default serversku matricu. JWT identifikuje korisnika, dok se aktuelna uloga u?itava iz baze pri svakom zahtjevu.

## A04 gre?ke i validacija

A04 uvodi zajedni?ki JSON error envelope, stabilne ma?inske kodove i Bean Validation za autentikacione ulaze. MVC, DB/domain konflikti i Spring Security `401`/`403` odgovori koriste isti ugovor bez izlaganja SQL-a ili infrastrukturnih detalja.

## A05 izvr?ivi API ugovor

A05 uvodi OpenAPI 3 specifikaciju za verzionisani `/api/v1` surface. Kada backend radi, JSON ugovor je na [`/v3/api-docs/v1`](http://localhost:8080/v3/api-docs/v1), a Swagger UI na [`/swagger-ui.html`](http://localhost:8080/swagger-ui.html). Po?etne auth i error DTO sheme su tipizirane i test ?ita stvarno generisani dokument. Zatvorene legacy rute nisu dio specifikacije.

## B01 hotel, korisnici i specijalizacije

B01 dodaje singleton profil jednog hotela, menad?ersko kreiranje i paginirani pregled korisnika, promjenu uloga, soft aktivaciju/deaktivaciju te dodjelu ?est stabilnih radni?kih specijalizacija. Posljednji aktivni menad?er je za?ti?en od deaktivacije/degradacije, a neaktivni nalozi se odbijaju u svim autentikacionim tokovima. Potpuno nova baza podr?ava opt-in jednokratni bootstrap prvog menad?era isklju?ivo kroz environment konfiguraciju. Migracija je `V3__hotel_users_specializations.sql`.
## Git tok

- `main` je stabilna po?etna verzija;
- `develop` je integraciona grana;
- budu?i rad koristi `feature/<task-id>-<naziv>` i pull request prema `develop`;
- A00 je jedini bootstrap koji se direktno commitira na `develop`.

## Originalni tim

Koristan istorijski kontekst i doprinosi originalnog tima ostaju sa?uvani u Git istoriji i direktorijumu `Dokumentacija`. Originalni remote je zadr?an kao `upstream`.

