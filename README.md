# Hipertrof.io

Prototype training diary for fast strength workout logging.

## What is included

- FastAPI backend with SQLAlchemy models for the MVP domain.
- PostgreSQL-backed Docker Compose setup.
- Demo athlete seeded automatically; registration and login are intentionally skipped for now.
- Exercise library, workout start, add exercise, smart auto-fill, add sets, complete workout.
- Statistics summary with tonnage, personal records, and basic achievements.
- React + TypeScript frontend for the core workout flow.

## Run with Docker Compose

```powershell
docker compose up --build
```

Then open:

- Frontend: http://localhost:5173
- Backend health: http://localhost:8000/health
- API docs: http://localhost:8000/docs

## Backend layout

```text
backend/src/app
  main.py              FastAPI app and startup seeding
  models.py            SQLAlchemy database structure
  schemas.py           Pydantic request/response contracts
  routers/             HTTP endpoints
  services/            Workout flow, smart auto-fill, statistics
```

The backend uses `DEMO_ATHLETE_ID=1` through settings. Auth can be added later by replacing the demo-user helper in `services/workouts.py`.

## Local backend fallback

Without `DATABASE_URL`, the backend uses a local SQLite database named `hipertrof_dev.db`.
