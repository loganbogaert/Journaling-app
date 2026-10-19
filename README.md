# Trading Journal

A self-hosted web app for tracking trading accounts and trades: log entries, exits, risk, fees and results, follow your account balance over time, and attach screenshots as trade evidence.

## Features

- **Auth** — Keycloak handles user registration/login/tokens; the Angular app redirects to Keycloak's hosted pages instead of implementing its own forms.
- **Gateway** — Kong is the single public entrypoint: it routes to the frontend, Keycloak, `trade-api` and MinIO, and stamps a shared secret on requests it forwards so `trade-api` can verify they actually came through it.
- **Accounts** — group trades under a named trading account with a starting balance and currency; track balance evolution over time with a chart. An account is either `manual` (trades entered by hand) or `connected` (trades synced from a broker — in progress). Owned by a Keycloak user id (`sub` claim), not a local user table.
- **Trades** — log entry/TP/SL price, direction (long/short), risk, fee, profit and result (win/breakeven/loss) per trade, linked to a currency pair and an account. Manual trades always require TP, SL and risk (enforced by the form, the API, the model and a DB check constraint); synced trades may lack them and their financial fields are read-only.
- **Pairs** — manage the list of tradable instruments (admin-only to create/delete, via Keycloak's `admin` realm role).
- **Trade pictures** — attach chart screenshots to a trade, stored in MinIO (S3-compatible object storage).
- **Dashboard** — overview of accounts and trading performance.

## Tech stack

- **Frontend**: Angular 18, Chart.js, keycloak-js
- **Gateway**: Kong (DB-less, declarative config)
- **Identity**: Keycloak
- **trade-api**: Node.js, Express 5, Sequelize, Joi
- **Database**: PostgreSQL
- **Object storage**: MinIO
- **Deployment**: Docker Compose (kong, keycloak, keycloak-db, trade-api, frontend, postgres, minio)

## Auth & security model

- Keycloak is the identity provider; the Angular SPA is a public OIDC client (Authorization Code + PKCE) that never sees a password.
- Kong sits in front of every service. It proxies `/api/*` to `trade-api` and injects an `X-Gateway-Secret` header on the way through.
- `trade-api` verifies every token itself against Keycloak's JWKS (`trade-api/src/middleware/auth.js`) and rejects any request missing the correct `X-Gateway-Secret` (`trade-api/src/middleware/gateway.js`), so the API is never reachable by skipping Kong.
- Ownership checks (an account/trade can only be read/edited/deleted by the Keycloak user id that created it) and role checks (`trade-api/src/middleware/requireRole.js`, e.g. `admin` for managing pairs) live in `trade-api`.

## Project structure

```
trade-api/  Express REST API (controllers, models, validators, migrations, routes)
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
   docker compose exec trade-api npm run db:migrate
   ```
4. The app is served through Kong on `http://localhost:8000`. Keycloak's admin console is reachable directly on `http://localhost:8080` for user/role management (e.g. assigning the `trader` or `admin` realm role to a new user — the `trading-journal` realm, its client and roles are auto-imported from `keycloak/realm-export.json` on first boot).

## Development notes

- trade-api and frontend Docker images bake the source at build time (no live volume mount) — after changing `trade-api/` or `Frontend/` sources, rebuild the corresponding service:
  ```
  docker compose build trade-api && docker compose up -d trade-api
  docker compose build frontend && docker compose up -d frontend
  ```
- trade-api migrations live in `trade-api/src/infrastructure/database/migrations`, managed with `sequelize-cli`.
- The frontend reads its Keycloak config (`KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`) from real container env vars at startup, not from the build — `Frontend/docker-entrypoint.d/40-generate-env.sh` renders `public/env.template.js` into `env.js` (loaded by `index.html` before the Angular bundle) using whatever values are set on the `frontend` service in `docker-compose.yml`. Change them there and restart the container; no rebuild needed.
