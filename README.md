# Trading Journal

A self-hosted web app for tracking trading sessions and trades: log entries, exits, risk, fees and results, follow your account balance over time, and attach screenshots as trade evidence.

## Features

- **Auth** — JWT-based register/login.
- **Sessions** — group trades under a named trading session with a starting account balance and currency; track balance evolution over time with a chart.
- **Trades** — log entry/TP/SL price, direction (long/short), risk, fee, profit and result (win/breakeven/loss) per trade, linked to a currency pair and a session.
- **Pairs** — manage the list of tradable instruments.
- **Trade pictures** — attach chart screenshots to a trade, stored in MinIO (S3-compatible object storage).
- **Dashboard** — overview of sessions and trading performance.

## Tech stack

- **Frontend**: Angular 18, Chart.js
- **Backend**: Node.js, Express 5, Sequelize
- **Database**: PostgreSQL
- **Object storage**: MinIO
- **Deployment**: Docker Compose (backend, frontend/nginx, postgres, minio)

## Project structure

```
Backend/    Express REST API (controllers, models, migrations, routes)
Frontend/   Angular app (pages, components, services)
docker-compose.yml
```

## Getting started

1. Copy the env template and fill in real values:
   ```
   cp .env.example .env
   ```
2. Build and start everything:
   ```
   docker compose up -d --build
   ```
3. Run database migrations (first run only):
   ```
   docker compose exec backend npm run db:migrate
   ```
4. Frontend is served on the port configured in `docker-compose.yml`; the backend exposes the REST API consumed by the Angular app.

## Development notes

- Backend and frontend Docker images bake the source at build time (no live volume mount) — after changing `Backend/` or `Frontend/` sources, rebuild the corresponding service:
  ```
  docker compose build backend && docker compose up -d backend
  docker compose build frontend && docker compose up -d frontend
  ```
- Backend migrations live in `Backend/src/infrastructure/database/migrations`, managed with `sequelize-cli`.
