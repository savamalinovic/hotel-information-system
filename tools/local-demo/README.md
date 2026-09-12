# Lokalni demo API i Android povezivanje

Ovi alati pripremaju isključivo lokalnu demo bazu, pokreću backend i stvaraju osnovne poslovne podatke kroz postojeći `/api/v1` API. To nije produkcijski deployment. Flyway tokom Spring Boot starta pravi šemu; `Seed-DemoData.ps1` ne koristi SQL za poslovne podatke.

## Preduslovi i tajne

Potrebni su PowerShell 5.1+, JDK 17, PostgreSQL klijent `psql` i pokrenut lokalni PostgreSQL. `adb` je potreban samo za fizički Android uređaj. Lokalni object storage koristi standalone MinIO; Docker nije potreban za MinIO. PostgreSQL može biti pokrenut postojećim root Compose servisom:

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

`Reset-DemoDatabase.ps1` automatski traži `psql.exe`: prvo na `PATH`, zatim pod standardnim Windows direktorijumom `C:\Program Files\PostgreSQL`, birajući najnoviju numeričku verziju. Ako je potreban drugi klijent, eksplicitno navedite provjerenu putanju:

```powershell
.\Reset-DemoDatabase.ps1 -PsqlPath 'C:\Program Files\PostgreSQL\17\bin\psql.exe'
```

## Najbrže pokretanje

U jednom PowerShell procesu, nakon postavljanja potrebnih varijabli iz prethodne sekcije:

```powershell
.\Start-LocalDemo.ps1
```

To koristi postojeći reset/create, backend launcher i oba API seedera, zatim postavlja Android `adb reverse` za port 8080. Lozinke i tokeni se ne ispisuju. Najvažnije procesne varijable su `POSTGRES_USER`, `POSTGRES_PASSWORD`, `EFIKAS_JWT_SECRET`, `BLUESTARS_DEMO_PASSWORD` i `BLUESTARS_DEMO_MANAGER_*` vrijednosti iz gornjeg primjera.

Za eksplicitni čisti reset koristite:

```powershell
.\Start-LocalDemo.ps1 -ResetDatabase
```

Za izolovanu provjeru bez telefona i na drugom portu koristite `-SkipAdb`, npr. `-ServerPort 8081`. Android aplikacija ostaje vezana za 8080.

## Lokalni MinIO object storage

Ručno preuzmite zvanične Windows `minio.exe` i `mc.exe` binarne fajlove i stavite ih u ignorisani direktorijum `tools/local-demo/bin/`, ili ih dodajte na `PATH`. Alati ih ne preuzimaju tokom običnog starta. Mogu se navesti i eksplicitno kroz `-MinioPath` i `-McPath`. Ne stavljajte binarne fajlove, ključeve ili sadržaj bucketa u Git.

Za standalone demo postavite procesne vrijednosti; AWS ključevi moraju odgovarati MinIO root korisniku jer launcher koristi samo lokalni root nalog. Verzija `mc` koja je podržana ovim workflowom ne dekodira `MC_HOST_*` user-info, pa i user i password moraju koristiti samo URL-unreserved ASCII skup: slova, brojevi, `_` i `-`. User mora imati najmanje 3, a password najmanje 32 znaka; posebni znakovi nisu potrebni.

```powershell
$env:BLUESTARS_MINIO_ROOT_USER = 'bluestarsdemo'
$env:BLUESTARS_MINIO_ROOT_PASSWORD = '<generate-a-local-url-safe-password>'
$env:EFIKAS_AWS_REGION = 'eu-central-1'
$env:EFIKAS_AWS_ENDPOINT = 'http://127.0.0.1:9000'
$env:EFIKAS_AWS_PATH_STYLE_ACCESS_ENABLED = 'true'
$env:EFIKAS_AWS_ACCESS_KEY_ID = $env:BLUESTARS_MINIO_ROOT_USER
$env:EFIKAS_AWS_SECRET_ACCESS_KEY = $env:BLUESTARS_MINIO_ROOT_PASSWORD
$env:EFIKAS_AWS_BUCKET = 'bluestars-demo'
```

Generišite novu lokalnu password vrijednost kriptografski sigurnim generatorom i postavite je samo u trenutnom PowerShell procesu:

```powershell
$credentialAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'
$random = [Security.Cryptography.RandomNumberGenerator]::Create()
try {
    $bytes = New-Object byte[] 64
    $builder = New-Object Text.StringBuilder
    while ($builder.Length -lt 48) {
        $random.GetBytes($bytes)
        foreach ($byte in $bytes) {
            [void]$builder.Append($credentialAlphabet[$byte % $credentialAlphabet.Length])
            if ($builder.Length -ge 48) { break }
        }
    }
    $localMinioPassword = $builder.ToString()
} finally {
    $random.Dispose()
}

$env:BLUESTARS_MINIO_ROOT_USER = 'bluestars_demo'
$env:BLUESTARS_MINIO_ROOT_PASSWORD = $localMinioPassword
$env:EFIKAS_AWS_ACCESS_KEY_ID = $env:BLUESTARS_MINIO_ROOT_USER
$env:EFIKAS_AWS_SECRET_ACCESS_KEY = $localMinioPassword
```

Vrijednosti su samo u trenutnom procesu; launcher ih ne stavlja u argumente, state, log ili izlaz. MinIO se veže isključivo na `127.0.0.1`, koristi `tools/local-demo/.local-object-storage/data`, upisuje ownership state bez tajni i čeka readiness na portu 9000.

Pokretanje i provjera bucketa su idempotentni:

```powershell
.\Start-LocalDemoObjectStorage.ps1
```

S3 API je `http://127.0.0.1:9000`, a konzola `http://127.0.0.1:9001`. Drugi poziv ne pokreće dupli MinIO proces niti briše postojeće objekte.

Kompletan redoslijed bez automatskog ADB koraka je:

```powershell
.\Start-LocalDemoObjectStorage.ps1
.\Start-LocalDemo.ps1 -SkipAdb
.\Test-LocalDemoObjectStorage.ps1
.\Set-AndroidAdbReverse.ps1 -IncludeObjectStorage
```

## Provjera i zaustavljanje

```powershell
.\Test-LocalDemo.ps1
.\Stop-DemoBackend.ps1 -Force
```

`Test-LocalDemo.ps1` radi read-only API provjere podataka i RBAC-a. Za uklanjanje samo Android prosljeđivanja dodajte `-RemoveAdbReverse`; za strogo čuvanu eksplicitnu brisanje demo/test baze dodajte `-DropDatabase -DatabaseName bluestars_demo`. Nikad se ne zaustavlja nepovezan proces niti PostgreSQL servis.

## Opcionalni object-storage smoke

Ako su u procesu postavljene sve `EFIKAS_AWS_*` vrijednosti iz prethodne sekcije i backend je pokrenut sa istim procesnim vrijednostima, pokrenite:

```powershell
.\Test-LocalDemoObjectStorage.ps1
```

Bez potpune konfiguracije rezultat je `SKIPPED`. Smoke kroz javni API provjerava fotografiju apartmana, task prilog i damage prilog, uključujući download i podudaranje bajtova. Dodaje male objekte u bucket; task i damage prilozi nemaju javni delete endpoint, zato za čist test koristite novi izolovani bucket ili eksplicitni guarded cleanup lokalnog MinIO data direktorijuma. Apartment picture zapis ima postojeći javni delete endpoint, ali smoke ga namjerno ne poziva.

## Rješavanje problema

- Pogrešna PostgreSQL lozinka: provjerite samo procesnu `POSTGRES_PASSWORD` vrijednost i ponovite komandu.
- Port 8080 zauzet: runner odbija nepovezan proces; za izolaciju koristite `-ServerPort 8081 -SkipAdb`.
- ADB nije autorizovan: otključajte telefon, potvrdite USB debugging i ponovite komandu.
- Nedostaje JDK 17: instalirajte/odaberite JDK 17 prije pokretanja backenda.
- Backend nije spreman: pregledajte putanje do lokalnih logova koje ispiše launcher, pa zaustavite evidentirani proces.
- Object storage nije konfigurisan: osnovni demo je i dalje upotrebljiv; attachment smoke ostaje `SKIPPED`.
- MinIO ili `mc` nedostaje: stavite zvanične Windows binarne fajlove u `tools/local-demo/bin/` ili proslijedite njihove eksplicitne putanje. Nema automatskog download-a.
- Port 9000 ili 9001 je zauzet: pronađite vlasnički PID kroz `Get-NetTCPConnection -LocalPort 9000,9001 -State Listen`; ne gasite široko procese. Zaustavite samo poznati lokalni MinIO ili oslobodite port prije starta.
- Presigned URL nije dostupan telefonu: provjerite `EFIKAS_AWS_ENDPOINT=http://127.0.0.1:9000`, path-style `true`, MinIO loopback binding i `adb reverse tcp:9000 tcp:9000`.

## Čist početak

Iz ovog direktorijuma:

```powershell
.\Reset-DemoDatabase.ps1
.\Start-DemoBackend.ps1
.\Seed-DemoData.ps1
.\Seed-DemoScenarios.ps1
```

Prva skripta pravi samo praznu `bluestars_demo` bazu. Ako već postoji, bez `-Reset` je ne mijenja. Potpuni, eksplicitni reset je:

```powershell
.\Reset-DemoDatabase.ps1 -DatabaseName bluestars_demo -Reset
```

Skripta odbija produkcijske/sistemske nazive, nazive bez `demo`/`test` markera i nelokalne hostove; prije brisanja prikazuje server, port i bazu. `Start-DemoBackend.ps1` provjerava JDK 17 i slobodan port 8080, koristi `application.example.properties` samo kao read-only izvor lokalne konfiguracije, uključuje manager bootstrap samo u tom procesu i čeka da backend postane dostupan. Ne nastavlja dok Flyway kroz normalan Spring Boot start ne obradi postojeće V1–V21 migracije. Za izolovanu lokalnu provjeru kada je 8080 zauzet može se navesti `-ServerPort`; Android rad ostaje na podrazumijevanom portu 8080.

Uobičajeni demo rad koristi backend i seed na portu 8080. Seed prihvata isključivo lokalne URL-ove `http://127.0.0.1:<port>/api/v1` ili `http://localhost:<port>/api/v1`; odbija HTTPS, udaljene hostove i pogrešan API path. Port 8081 je namijenjen samo izolovanoj lokalnoj verifikaciji kada nepovezan proces već koristi 8080, npr. `Seed-DemoData.ps1 -ApiBaseUrl http://127.0.0.1:8081/api/v1`. Ispisuje `created`, `already exists`, `updated` ili `failed`; svako ponovno pokretanje najprije traži postojeće resurse, tako da ne duplira podatke. Ako je ranije deaktiviran demo apartman ili tip, javni API ga ne može reaktivirati; seed sigurno prekida i navodi taj nedostatak umjesto da napravi duplikat.

Seed kreira/pronalazi: bootstrap menadžera, dva agenta, šest aktivnih operativnih radnika (po jedan za svaku postojeću specijalizaciju), tri tipa apartmana, osam apartmana, četiri aktivne kategorije troška i singleton profil hotela. Na kraju bez lozinke ispisuje e-mail i ulogu svih demo naloga te provjerava prijavu svakog od njih.

## Poslovni demo scenariji

`Seed-DemoScenarios.ps1` se pokreće tek poslije uspješnog `Seed-DemoData.ps1`. Namijenjen je samo lokalnom demo okruženju i koristi postojeće javne `/api/v1` rute, redovnu autentifikaciju i RBAC. Ne koristi SQL za poslovne podatke niti pravi demo API rute.

Kratki redoslijed za Android ručno testiranje je: (1) start MinIO ako se testiraju objekti, (2) reset baze, (3) start backenda, (4) `Seed-DemoData.ps1`, (5) `Seed-DemoScenarios.ps1`, (6) `Set-AndroidAdbReverse.ps1 -IncludeObjectStorage` kada je storage konfigurisan, pa (7) prijava u Android aplikaciju jednim od naloga ispod.

Scenariji su vezani za današnji datum lokalnog backenda. Možete ga eksplicitno navesti samo kao današnji ISO datum:

```powershell
.\Seed-DemoScenarios.ps1 -ApiBaseUrl http://127.0.0.1:8080/api/v1 -ReferenceDate 2026-09-11
```

Skripta provjerava HTTP datum lokalnog backenda u zoni hotela prije nego što išta promijeni. Ponovno pokretanje istog dana dopunjava samo nedostajuće korake preko markera `[DEMO:<SCENARIO>:<DATE>]`. Za čisto ponavljanje drugog dana resetujte demo bazu, zatim ponovite osnovni i scenario seed. Upload priloga/object storage i stvarni mobilni push nisu dio seeda.

| Uloga | Demo nalog |
| --- | --- |
| Manager | vrijednost `BLUESTARS_DEMO_MANAGER_EMAIL` |
| Agent | `demo.agent.one@bluestars.local` |
| Agent | `demo.agent.two@bluestars.local` |
| Operational worker | `demo.worker.<specialization>@bluestars.local` |

| Scenario | Završno stanje |
| --- | --- |
| R1 | domaći gost, dvije uplate, check-out, demo račun i novi cleaning task |
| R2 | strani i domaći gost, puna uplata, check-out, demo račun i završen cleaning |
| R3 | trenutno prijavljen, djelimično plaćen |
| R4 | potvrđen današnji check-in sa claim/release/takeover istorijom |
| R5 | budući potvrđen i neplaćen boravak po default cijeni |
| R6 | budući potvrđen boravak sa override cijenom, korekcijom i stornom uplate |
| R7 | otkazan budući boravak |
| R8 | današnji no-show bez knjige gostiju i računa |

Uz matricu rezervacija seed pravi ručne taskove u svim lifecycle stanjima, attendance/override/leave primjere, 12 kategorisanih operativnih troškova (jedan storniran), četiri štete i budući period van upotrebe. Knjige, audit, notifikacije i istorije nastaju isključivo kao posljedica tih poslovnih akcija.

## Android uređaj

Sa jednim autorizovanim uređajem:

```powershell
.\Set-AndroidAdbReverse.ps1
```

Kada je MinIO namjerno konfigurisan, eksplicitno uključite i storage port:

```powershell
.\Set-AndroidAdbReverse.ps1 -IncludeObjectStorage
```

Za više uređaja navedite serial:

```powershell
.\Set-AndroidAdbReverse.ps1 -DeviceSerial YOUR_DEVICE_SERIAL
.\Set-AndroidAdbReverse.ps1 -IncludeObjectStorage -DeviceSerial YOUR_DEVICE_SERIAL
```

Skripta prikazuje `adb devices`, odbija `unauthorized`, `offline` i dvosmislene uređaje. Bez dodatne opcije postavlja i provjerava postojeći `adb reverse tcp:8080 tcp:8080`; sa `-IncludeObjectStorage` postavlja i provjerava `adb reverse tcp:9000 tcp:9000`. Android aplikacija ima fiksni `127.0.0.1:8080` URL; preko reverse pravila port 8080 vodi na backend, a 9000 na MinIO S3 API računara. Bez aktivnog pravila aplikacija neće vidjeti lokalni backend ili objekte.

## Gašenje, reset i provjere

Za zaustavljanje lokalnog Java backend procesa i standalone MinIO procesa:

```powershell
.\Stop-DemoBackend.ps1 -Force -RemoveAdbReverse -RemoveObjectStorageAdbReverse
.\Stop-LocalDemoObjectStorage.ps1 -Force
```

Skripte provjeravaju PID i start-time prije zaustavljanja i ne zaustavljaju PostgreSQL, backend ili nepovezani MinIO. `Stop-LocalDemoObjectStorage.ps1 -Force` po defaultu zadržava bucket i data direktorijum. Za eksplicitni čist storage cleanup koristite samo:

```powershell
.\Stop-LocalDemoObjectStorage.ps1 -Force -CleanupData
```

Ovaj parametar ima strogi path guard i može obrisati samo `tools/local-demo/.local-object-storage/data`, zajedno sa lokalnim storage logovima; ne prihvata root, workspace ili proizvoljan direktorijum. Za ponovni čisti demo prvo zaustavite backend i storage, zatim uradite `Reset-DemoDatabase.ps1 -Reset`, pokrenite backend i seed redoslijedom iznad.

Statičke provjere bez dodatnog test frameworka:

```powershell
.\tests\LocalDemo.Static.Tests.ps1
```

Object-storage safety i lifecycle testovi:

```powershell
.\tests\LocalDemo.ObjectStorage.Tests.ps1
```
