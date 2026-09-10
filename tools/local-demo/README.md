# Lokalni demo API i Android povezivanje

Ovi alati pripremaju isključivo lokalnu demo bazu, pokreću backend i stvaraju osnovne poslovne podatke kroz postojeći `/api/v1` API. To nije produkcijski deployment. Flyway tokom Spring Boot starta pravi šemu; `Seed-DemoData.ps1` ne koristi SQL za poslovne podatke.

## Preduslovi i tajne

Potrebni su PowerShell 5.1+, JDK 17, PostgreSQL klijent `psql`, pokrenut lokalni PostgreSQL i `adb` za fizički Android uređaj. PostgreSQL može biti pokrenut postojećim root Compose servisom:

```powershell
docker compose up -d --wait postgres
```

U trenutnom PowerShell procesu postavite vrijednosti. Primjeri su placeholderi: ne commitujte `.env` sa stvarnim vrijednostima.

```powershell
$env:POSTGRES_USER = 'your-local-user'
$env:POSTGRES_PASSWORD = 'your-local-postgres-password'
$env:EFIKAS_JWT_SECRET = 'a-long-local-jwt-secret'
$env:BLUESTARS_DEMO_PASSWORD = 'a-demo-password-with-at-least-8-characters'
$env:BLUESTARS_DEMO_MANAGER_EMAIL = 'demo.manager@bluestars.local'
$env:BLUESTARS_DEMO_MANAGER_NAME = 'Demo'
$env:BLUESTARS_DEMO_MANAGER_SURNAME = 'Manager'
$env:BLUESTARS_DEMO_MANAGER_JMBG = '1000000000000'
$env:BLUESTARS_DEMO_MANAGER_ADDRESS = 'Demo Street 1'
$env:BLUESTARS_DEMO_MANAGER_PHONE = '+387 65 100 000'
```

Skripte prihvataju iste vrijednosti i kao eksplicitne parametre. Lozinke, JWT secret i JWT nikada se ne pišu u tracked fajl, terminalski izlaz ili seed rezultat. Za reset se PostgreSQL lozinka prosljeđuje procesu `psql` samo kroz privremenu procesnu `PGPASSWORD` varijablu.

## Čist početak

Iz ovog direktorijuma:

```powershell
.\Reset-DemoDatabase.ps1
.\Start-DemoBackend.ps1
.\Seed-DemoData.ps1
```

Prva skripta pravi samo praznu `bluestars_demo` bazu. Ako već postoji, bez `-Reset` je ne mijenja. Potpuni, eksplicitni reset je:

```powershell
.\Reset-DemoDatabase.ps1 -DatabaseName bluestars_demo -Reset
```

Skripta odbija produkcijske/sistemske nazive, nazive bez `demo`/`test` markera i nelokalne hostove; prije brisanja prikazuje server, port i bazu. `Start-DemoBackend.ps1` provjerava JDK 17 i slobodan port 8080, koristi `application.example.properties` samo kao read-only izvor lokalne konfiguracije, uključuje manager bootstrap samo u tom procesu i čeka da backend postane dostupan. Ne nastavlja dok Flyway kroz normalan Spring Boot start ne obradi postojeće V1–V21 migracije.

Seed se spaja samo na `http://127.0.0.1:8080/api/v1` ili `http://localhost:8080/api/v1`. Odbija HTTPS, udaljene hostove i pogrešan API path. Ispisuje `created`, `already exists`, `updated` ili `failed`; svako ponovno pokretanje najprije traži postojeće resurse, tako da ne duplira podatke. Ako je ranije deaktiviran demo apartman ili tip, javni API ga ne može reaktivirati; seed sigurno prekida i navodi taj nedostatak umjesto da napravi duplikat.

Seed kreira/pronalazi: bootstrap menadžera, dva agenta, šest aktivnih operativnih radnika (po jedan za svaku postojeću specijalizaciju), tri tipa apartmana, osam apartmana, četiri aktivne kategorije troška i singleton profil hotela. Na kraju bez lozinke ispisuje e-mail i ulogu svih demo naloga te provjerava prijavu svakog od njih.

## Android uređaj

Sa jednim autorizovanim uređajem:

```powershell
.\Set-AndroidAdbReverse.ps1
```

Za više uređaja navedite serial:

```powershell
.\Set-AndroidAdbReverse.ps1 -DeviceSerial YOUR_DEVICE_SERIAL
```

Skripta prikazuje `adb devices`, odbija `unauthorized`, `offline` i dvosmislene uređaje, postavlja i provjerava `adb reverse tcp:8080 tcp:8080`. Android aplikacija koristi `127.0.0.1:8080`; preko aktivnog `adb reverse` pravila taj port vodi na port 8080 računara. Bez aktivnog pravila aplikacija neće vidjeti lokalni backend. Nakon toga pokrenite već instaliranu Android aplikaciju i prijavite se jednim e-mailom koje seed prikaže.

## Gašenje, reset i provjere

Za zaustavljanje lokalnog Java backend procesa na portu 8080:

```powershell
.\Stop-DemoBackend.ps1 -Force
```

Skripta odbija zaustavljanje neprepoznatog procesa. Za ponovni čisti demo prvo je ugasite, zatim uradite `Reset-DemoDatabase.ps1 -Reset`, pokrenite backend i seed redoslijedom iznad.

Statičke provjere bez dodatnog test frameworka:

```powershell
.\tests\LocalDemo.Static.Tests.ps1
```
