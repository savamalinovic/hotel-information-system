# Udaljeni BlueStars demo seed

Ovaj workflow je namijenjen isključivo posebno odobrenoj demo instanci nakon Railway deploya. Koristi javni autentifikovani `/api/v1` API. Menadžer mora već postojati kroz jednokratni Railway bootstrap. Skripte ne kreiraju bazu, ne pristupaju PostgreSQL-u i ne brišu podatke.

## Priprema

U PowerShell sesiji postavite `BLUESTARS_DEMO_MANAGER_EMAIL` i `BLUESTARS_DEMO_PASSWORD` bez upisivanja vrijednosti u skriptu, komandnu liniju ili log. Na primjer, unesite ih interaktivno:

```powershell
$env:BLUESTARS_DEMO_MANAGER_EMAIL = Read-Host 'Demo manager email'
$secure = Read-Host 'Demo password' -AsSecureString
$env:BLUESTARS_DEMO_PASSWORD = [Net.NetworkCredential]::new('', $secure).Password
$secure = $null
```

Za svaku komandu navedite pun HTTPS URL oblika `https://<host>/api/v1` i isti host u `-ConfirmHost`. Podrazumijevano je prihvaćen samo Railway `*.up.railway.app`. Za drugi unaprijed odobren javni HTTPS DNS host dodajte `-AllowedHost '<host>'`. URL sa HTTP protokolom, IP adresom, lokalnim hostom, portom, credentials dijelom, queryjem, fragmentom ili preusmjeravanjem se odbija.

## Izvršavanje

Prvi seed (uključuje završnu read-only provjeru):

```powershell
.\tools\remote-demo\Start-RemoteDemo.ps1 -ApiBaseUrl 'https://example-demo.up.railway.app/api/v1' -ConfirmHost 'example-demo.up.railway.app'
```

Pokrenite **istu komandu drugi put** za provjeru idempotentnosti. Za samostalnu završnu provjeru:

```powershell
.\tools\remote-demo\Start-RemoteDemo.ps1 -ApiBaseUrl 'https://example-demo.up.railway.app/api/v1' -ConfirmHost 'example-demo.up.railway.app' -VerifyOnly
```

Seeder pronalazi demo zapise po stabilnim nazivima i markerima, provjerava očekivane statuse i prekida kod konflikta. R1–R8 koriste datum hotela iz HTTP Date zaglavlja. Pri ponovnom pokretanju datum se izvodi iz već postojećih markera; opcioni `-ReferenceDate yyyy-MM-dd` mora odgovarati postojećem setu. Ako se proces prekine, pregledajte posljednju grešku i postojeće podatke, pa ponovite istu komandu. Ne resetujte udaljenu bazu. Ako su postojeći podaci izmijenjeni ili su markeri duplirani, riješite konflikt ručno prije nastavka.

Završna provjera čita glavne brojače i statuse rezervacija, uplata, računa, zadataka, HRM primjera, troškova, šteta i nedostupnosti. Provjerava prijave demo naloga, RBAC odbijanje agenta na `/users` i odsustvo duplih demo kataloških zapisa i R1–R8 markera. Ponovljeni seed je potreban za praktičnu provjeru idempotentnosti u ciljnom okruženju.

Cloudflare R2 object-storage sadržaj se ne seeduje ovdje. R2 upload/download provjerite zasebnim runtime smoke testom nakon deploya.
