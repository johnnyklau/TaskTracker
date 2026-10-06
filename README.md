# TaskTracker

https://tasktracker-hsy.vercel.app/

[![.github/workflows/ci.yml](https://github.com/johnnyklau/TaskTracker/actions/workflows/ci.yml/badge.svg)](https://github.com/johnnyklau/TaskTracker/actions/workflows/ci.yml)
[![CD](https://github.com/johnnyklau/TaskTracker/actions/workflows/cd.yml/badge.svg)](https://github.com/johnnyklau/TaskTracker/actions/workflows/cd.yml)

This project is created with a simple goal: take a simple concept and flesh it out fully.

This is a basic to-do style app, but my aim was to ensure it was as complete as possible: CI/CD, fully tested, full-stack web app as the end goal. In this project, I used AI as a learning tool, learning about and applying standard industry practices within the code.

## Tech Stack

**Front-end:** React + TypeScript built with Vite, styled with Tailwind, deployed on Vercel.

**Back-end:** Node + Express, containerized with Docker, deployed to Render.

**Database:** PostgreSQL, hosted on Neon.

**Authentication:** JWT-based Auth built directly on Express.

**Testing:**

- Frontend — Vitest + React Testing Library
- Backend — Vitest + Supertest, run against a real Postgres instance
  (locally via Docker Compose, in CI via a GitHub Actions service container)

**CI/CD:** GitHub Actions.

- CI: lint, test, and build both projects, plus a Docker image build, on every PR
- CD: on merge to `main`, deploys the frontend to Vercel and the backend
  image to Render, each via their respective CLI/API rather than native
  git-triggered auto-deploy, keeping the deploy step explicit and visible

**Also configured:**

- JWT access/refresh token pair with rotation and revocation
- branch protection (CI must pass to merge)
- Dependabot (dependency + GitHub Actions updates)
- CodeQL (automated security scanning).

## Running Locally

### Prerequisites

- Node 24
- Docker or OrbStack running

### Setup

1. Clone the repo.
2. In `backend/`, create a `.env` file (see `.env.example`) with your local `DATABASE_URL`.
3. In `frontend/`, create a `.env.local` file (see `.env.example`) with `VITE_API_URL=http://localhost:3000`.

### Option A — hybrid (recommended for active development)

Start Postgres only, run the backend directly for fast reload on save:

```
docker compose up -d postgres
cd backend && npm run dev
```

In a second terminal, start the frontend:

```
cd frontend && npm run dev
```

### Option B — fully containerized

Runs the backend exactly as it would build in CI/production:

```
docker compose up
```

Then separately start the frontend with `npm run dev`, same as above — the frontend was never containerized (see the architecture notes above).

### Database setup

On first start with an empty volume, Postgres sets itself up automatically:

- `tasktracker` (dev data) gets the schema from `backend/src/db/schema.sql`
- `tasktracker_test` is created with the same schema, for the backend tests

These init scripts only run when the `pgdata` volume is empty. If you already have a volume from before this setup, either load things manually:

```
docker compose exec -T postgres psql -U postgres -d tasktracker < backend/src/db/schema.sql
docker compose exec postgres psql -U postgres -c 'CREATE DATABASE tasktracker_test'
docker compose exec -T postgres psql -U postgres -d tasktracker_test < backend/src/db/schema.sql
```

or reset the volume with `docker compose down -v` (this deletes your local dev data).

### Running tests

```
cd backend && npm test    # runs against tasktracker_test, never your dev data
cd frontend && npm test
```

Set `TEST_DATABASE_URL` to point the backend tests at a different database.
