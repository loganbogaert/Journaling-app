# Trading Journal

A self-hosted web app for tracking trading sessions and trades: log entries, exits, risk, fees and results, follow your account balance over time, and attach screenshots as trade evidence.

## Features

- **Auth** — Keycloak handles user registration/login/tokens; the Angular app redirects to Keycloak's hosted pages instead of implementing its own forms.
- **Gateway** — Kong is the single public entrypoint: it routes to the frontend, Keycloak, the backend API and MinIO, authenticates API requests against Keycloak, and stamps a shared secret on requests it forwards so the backend can verify they actually came through it.
- **Sessions** — group trades under a named trading session with a starting account balance and currency; track balance evolution over time with a chart. Owned by a Keycloak user id (`sub` claim), not a local user table.
- **Trades** — log entry/TP/SL price, direction (long/short), risk, fee, profit and result (win/breakeven/loss) per trade, linked to a currency pair and a session.
- **Pairs** — manage the list of tradable instruments (admin-only to create/delete, via Keycloak's `admin` realm role).
- **Trade pictures** — attach chart screenshots to a trade, stored in MinIO (S3-compatible object storage).
- **Dashboard** — overview of sessions and trading performance.

## Tech stack

- **Frontend**: Angular 18, Chart.js, keycloak-js
- **Gateway**: Kong (DB-less, declarative config)
- **Identity**: Keycloak
- **Backend**: Node.js, Express 5, Sequelize
- **Database**: PostgreSQL
- **Object storage**: MinIO
- **Deployment**: Docker Compose (kong, keycloak, keycloak-db, backend, frontend, postgres, minio)

## Auth & security model

- Keycloak is the identity provider; the Angular SPA is a public OIDC client (Authorization Code + PKCE) that never sees a password.
- Kong sits in front of every service. It's configured (`kong/kong.yml`) to validate the caller's Keycloak access token on `/api/*` before proxying to the backend, and to inject an `X-Gateway-Secret` header on the way through.
- The backend re-verifies every token itself against Keycloak's JWKS (`Backend/src/middleware/auth.js`) and rejects any request missing the correct `X-Gateway-Secret` (`Backend/src/middleware/gateway.js`) — defense in depth, so the API is never safely reachable by skipping Kong.
- Ownership checks (a session/trade can only be read/edited/deleted by the Keycloak user id that created it) and role checks (`Backend/src/middleware/requireRole.js`, e.g. `admin` for managing pairs) still live in the backend.

## Project structure

```
Backend/    Express REST API (controllers, models, migrations, routes)
Frontend/   Angular app (pages, components, services)
kong/       Kong declarative gateway config
keycloak/   Keycloak realm export (auto-imported on first boot)
docker-compose.yml
```

## Getting started

1. Copy the env template and fill in real values (including `KEYCLOAK_ADMIN`, `KEYCLOAK_ADMIN_PASSWORD`, `KEYCLOAK_DB_PASSWORD` and `KONG_GATEWAY_SECRET`):
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
4. The app is served through Kong on `http://localhost:8000`. Keycloak's admin console is reachable directly on `http://localhost:8080` for user/role management (e.g. assigning the `trader` or `admin` realm role to a new user — the `trading-journal` realm, its client and roles are auto-imported from `keycloak/realm-export.json` on first boot).

## Development notes

- Backend and frontend Docker images bake the source at build time (no live volume mount) — after changing `Backend/` or `Frontend/` sources, rebuild the corresponding service:
  ```
  docker compose build backend && docker compose up -d backend
  docker compose build frontend && docker compose up -d frontend
  ```
- Backend migrations live in `Backend/src/infrastructure/database/migrations`, managed with `sequelize-cli`.
