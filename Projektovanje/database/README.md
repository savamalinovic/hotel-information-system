# Baza podataka

Autoritativna šema je od A02 u verzionisanim Flyway migracijama:

`Projektovanje/backend/efikas/src/main/resources/db/migration`

Prethodni `efikas_ddl.sql` premješten je bez promjene modela u `V1__baseline_legacy_schema.sql`. Novi DDL se više ne pokreće ručno niti kroz Docker init; backend/Flyway je jedini vlasnik promjena šeme.

`efikas_mock_data.sql` je naslijeđeni, trenutno neusklađeni primjer podataka i ne izvršava se automatski. Budući seed podaci moraju biti odvojeni od produkcijskih migracija.
