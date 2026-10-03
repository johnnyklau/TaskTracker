#!/bin/sh
# Runs once, on a fresh Postgres volume (docker-entrypoint-initdb.d).
# Creates the separate database the backend tests run against, so test
# runs never touch the dev data in POSTGRES_DB.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -c 'CREATE DATABASE tasktracker_test'
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname tasktracker_test \
  -f /docker-entrypoint-initdb.d/schema.sql
