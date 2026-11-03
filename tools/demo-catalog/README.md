# Presentation catalogs and apartment photographs

Both `tools/local-demo/Seed-DemoData.ps1` and `tools/remote-demo/Seed-DemoData.ps1` use these shared definitions. They create three apartment types, eight apartments with stable identifiers A101–C303, and eight Serbian expense categories. A recognized legacy `Demo ...` catalog record is renamed through its authenticated public API without replacing its ID, so reservations, expenses and audit references remain intact.

Before changing catalogs, the seed validates every recognized existing definition and the hotel profile. Inactive, edited, duplicate, or ambiguous legacy/canonical identities stop the seed. Unrelated records are retained. A canonical record must match the expected definition on subsequent runs; the seed does not overwrite later user edits. The Railway database is never reset and no business-table SQL is used.

## Source images

The five JPEG files in `assets/` are original synthetic interior images prepared for the BlueStars demonstration; no real property is represented. They are source assets for a reproducible seed, not runtime bucket contents. The manifest records their 1200×800 dimensions and SHA-256 checksums. Each optimized file is under 200 KB.

- A101 and A102 use the studio photo.
- B201, B202 and B203 use the double-apartment photo.
- C301, C302 and C303 use the family living-room photo.
- C301 also includes the bedroom and kitchen photos.

The backend must have working private object storage before running either base seed. Local demos use the existing MinIO setup; the remote demo uses private Cloudflare R2. Uploads go through the manager-only apartment-picture API. No storage credential is accepted by these helpers.

The picture API exposes IDs, display order and temporary signed URLs, but no original filename or content hash. To recognize a previously committed upload even after a lost HTTP response, the seed reads only the selected demo apartments' listed images, compares their SHA-256 checksums, and uploads missing source content. It does not enumerate the bucket or persist signed URLs. Existing unrelated pictures and their order remain intact. Duplicate content stops the seed for review rather than deleting data. A second read verifies that uploaded content is present in the authenticated apartment listing and downloadable through fresh signed URLs.

Downloads carry no API authorization header, do not follow redirects, are bounded in time and size, and never write images or signed URLs to disk. Remote storage URLs must use the private HTTPS R2 endpoint. A failed download aborts before further uploads for that apartment; rerunning reacquires signed URLs and checks the actual committed content before uploading again.

Both final verification scripts assert canonical names and definitions, image checksums, and the existing R1–R8 invariants. The remote scenario seed retains the date anchored in existing scenario markers; catalog normalization never recreates historical scenarios.

## Checks

From the repository root:

```powershell
powershell.exe -NoProfile -NonInteractive -File tools/demo-catalog/tests/DemoCatalog.Tests.ps1
powershell.exe -NoProfile -NonInteractive -File tools/remote-demo/tests/RemoteDemo.Idempotency.Tests.ps1
powershell.exe -NoProfile -NonInteractive -File tools/remote-demo/tests/RemoteDemo.Static.Tests.ps1
powershell.exe -NoProfile -NonInteractive -File tools/local-demo/tests/LocalDemo.Static.Tests.ps1
```

Run the same authorized local or remote seed twice, then run its read-only verification. No record should be created or updated on the second run. Do not run two seeds concurrently: the existing API has no client-supplied upload idempotency key.
