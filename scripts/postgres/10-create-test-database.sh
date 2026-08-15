#!/bin/sh
set -eu

: "${POSTGRES_TEST_DB:=efikas_test}"

createdb --username "$POSTGRES_USER" "$POSTGRES_TEST_DB"
