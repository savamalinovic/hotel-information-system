#!/bin/sh
set -eu

: "${POSTGRES_TEST_DB:=efikas_test}"

psql --set ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --file /opt/efikas/efikas_ddl.sql

createdb --username "$POSTGRES_USER" "$POSTGRES_TEST_DB"

psql --set ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_TEST_DB" \
  --file /opt/efikas/efikas_ddl.sql
