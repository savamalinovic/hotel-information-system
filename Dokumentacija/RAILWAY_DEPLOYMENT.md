# Railway deployment (backend)

## Service setup

- Create the Railway backend service with Root Directory `/Projektovanje/backend/blueStars`.
- The included Java 17 multi-stage `Dockerfile` builds with Maven Wrapper and starts the executable JAR.
- Generate a public domain and use `/actuator/health` as the health-check path.
- Keep all secrets in Railway Variables and seal them where Railway offers this option.

## PostgreSQL variables

Add a Railway PostgreSQL service. Replace `Postgres` below with the actual service name:

```text
POSTGRES_HOST=${{Postgres.PGHOST}}
POSTGRES_PORT=${{Postgres.PGPORT}}
POSTGRES_DB=${{Postgres.PGDATABASE}}
POSTGRES_USER=${{Postgres.PGUSER}}
POSTGRES_PASSWORD=${{Postgres.PGPASSWORD}}
```

## Object storage (Cloudflare R2)

```text
PORT
EFIKAS_JWT_SECRET
EFIKAS_AWS_REGION=auto
EFIKAS_AWS_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
EFIKAS_AWS_PATH_STYLE_ACCESS_ENABLED=true
EFIKAS_AWS_ACCESS_KEY_ID
EFIKAS_AWS_SECRET_ACCESS_KEY
EFIKAS_AWS_BUCKET
```

R2 uses `EFIKAS_AWS_REGION=auto`, its Cloudflare endpoint, path-style access, and R2-only access keys. The R2 bucket remains private. The backend uses existing presigned URLs, so no R2 access key is exposed to a client and the bucket does not need to be public.

## Optional email delivery (AWS SES)

For the current demo, keep SES disabled:

```text
EFIKAS_SES_ENABLED=false
```

Only configure the following separate variables when email delivery is required:

```text
EFIKAS_SES_ENABLED=true
EFIKAS_SES_REGION
EFIKAS_SES_ACCESS_KEY_ID
EFIKAS_SES_SECRET_ACCESS_KEY
EFIKAS_EMAIL_SENDER
```

SES credentials and region must be AWS SES values; never reuse R2 credentials or the R2 `auto` region. Password recovery and OTP email are unavailable while SES is disabled; requests return a controlled service-unavailable error and no email is claimed as sent.

## Other backend variables

```text
PORT
EFIKAS_JWT_SECRET
EFIKAS_BOOTSTRAP_MANAGER_ENABLED=false
EFIKAS_BOOTSTRAP_MANAGER_EMAIL
EFIKAS_BOOTSTRAP_MANAGER_PASSWORD
EFIKAS_BOOTSTRAP_MANAGER_NAME
EFIKAS_BOOTSTRAP_MANAGER_SURNAME
EFIKAS_BOOTSTRAP_MANAGER_JMBG
EFIKAS_BOOTSTRAP_MANAGER_ADDRESS
EFIKAS_BOOTSTRAP_MANAGER_PHONE
EFIKAS_CORS_ALLOWED_ORIGINS
```

`PORT` is supplied by Railway; the application defaults to `8080` only outside Railway. Set `EFIKAS_CORS_ALLOWED_ORIGINS` to a comma-separated, explicit list only when a browser-based manager client is deployed. Native Android does not need CORS.

## One-time manager bootstrap

For a fresh database, set `EFIKAS_BOOTSTRAP_MANAGER_ENABLED=true` together with every `EFIKAS_BOOTSTRAP_MANAGER_*` value, deploy once, and verify that the manager can sign in. Immediately set `EFIKAS_BOOTSTRAP_MANAGER_ENABLED=false`, remove the bootstrap password and all unneeded bootstrap values from Railway Variables, and redeploy. Do not retain the bootstrap password outside Railway Variables.
