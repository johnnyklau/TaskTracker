# TaskTracker

https://tasktracker-hsy.vercel.app/

[![.github/workflows/ci.yml](https://github.com/johnnyklau/TaskTracker/actions/workflows/ci.yml/badge.svg)](https://github.com/johnnyklau/TaskTracker/actions/workflows/ci.yml)
[![CD](https://github.com/johnnyklau/TaskTracker/actions/workflows/cd.yml/badge.svg)](https://github.com/johnnyklau/TaskTracker/actions/workflows/cd.yml)

This project is created with a simple goal: take a simple concept and flesh it out fully.

This is a basic to-do style app, but my aim was to ensure it was as complete as possible: CI/CD, fully tested, full-stack web app as the end goal. This is also a departure from AI-assisted tools to freshen up on the fundamentals.

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

\`\`\`
docker compose up -d postgres
cd backend && npm run dev
\`\`\`

In a second terminal, start the frontend:

\`\`\`
cd frontend && npm run dev
\`\`\`

### Option B — fully containerized

Runs the backend exactly as it would build in CI/production:

\`\`\`
docker compose up
\`\`\`

Then separately start the frontend with `npm run dev`, same as above — the frontend was never containerized (see the architecture notes above).

### First-time database setup

Load the schema once against a fresh Postgres:

\`\`\`
docker compose exec -T postgres psql -U postgres -d tasktracker < backend/src/db/schema.sql
\`\`\`
