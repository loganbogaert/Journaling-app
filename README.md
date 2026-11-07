# Trading Journal

A self-hosted web app for tracking trading accounts and trades: log entries, exits, risk, fees and results, follow your account balance over time, and attach screenshots as trade evidence.

## Features

- **Auth** — Keycloak handles user registration/login/tokens; the Angular app redirects to Keycloak's hosted pages instead of implementing its own forms.
- **Gateway** — Kong is the single public entrypoint: it routes to the frontend, Keycloak, `trade-api` and MinIO, and stamps a shared secret on requests it forwards so `trade-api` can verify they actually came through it.
- **Service auth** — both APIs use shared Keycloak/Joi/Postgres helpers from `shared/`; each keeps its own service permission manifest.
- **Connected accounts** — provide MT4/MT5 login, server and investor password, then use **Sync now** on the account page. Broker integration stores the password encrypted with AES-256-GCM. No EA or local MetaTrader terminal is required. Creating a journal account does not contact MetaApi; the first sync registers its remote account.
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
- **broker-integration-api**: Node.js, Express 5, Sequelize, Joi
- **Shared APIs**: local `shared/` package for JWT verification, service auth, request validation, and Postgres config
- **Database**: PostgreSQL
- **Object storage**: MinIO
- **Deployment**: Docker Compose (kong, keycloak, keycloak-db, trade-api, broker-integration-api, frontend, postgres, minio)

## Auth & security model

- Keycloak is the identity provider; the Angular SPA is a public OIDC client (Authorization Code + PKCE) that never sees a password.
- Kong sits in front of every service. It proxies `/api/*` to `trade-api` and injects an `X-Gateway-Secret` header on the way through.
- `trade-api` verifies every token itself against Keycloak's JWKS (`trade-api/src/middleware/auth.js`) and rejects any request missing the correct `X-Gateway-Secret` (`trade-api/src/middleware/gateway.js`), so the API is never reachable by skipping Kong.
- Ownership checks (an account/trade can only be read/edited/deleted by the Keycloak user id that created it) and role checks (`trade-api/src/middleware/requireRole.js`, e.g. `admin` for managing pairs) live in `trade-api`.

## Project structure

```
trade-api/  Express REST API (controllers, models, validators, migrations, routes)
broker-integration-api/  Broker connection, synchronization and chart rendering service
shared/      Common Node helpers used by both APIs
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
4. Provision machine-to-machine clients in an existing Keycloak realm:
   ```
   bash keycloak/provision-service-clients.sh
   ```
   Set `TRADE_API_CLIENT_SECRET` and `BROKER_INTEGRATION_CLIENT_SECRET` in `.env` first. These clients are also included in `keycloak/realm-export.json` for fresh realm imports.
5. The app is served through Kong on `http://localhost:8000`. Keycloak's admin console is reachable directly on `http://localhost:8080` for user/role management (e.g. assigning the `trader` or `admin` realm role to a new user — the `trading-journal` realm, its client and roles are auto-imported from `keycloak/realm-export.json` on first boot).

## Development notes

- trade-api and frontend Docker images bake the source at build time (no live volume mount) — after changing `trade-api/` or `Frontend/` sources, rebuild the corresponding service:
  ```
  docker compose build trade-api && docker compose up -d trade-api
  docker compose build frontend && docker compose up -d frontend
  ```
- trade-api migrations live in `trade-api/src/infrastructure/database/migrations`, managed with `sequelize-cli`.
- `broker-integration-api` uses the same `DB_NAME` as `trade-api` but owns the `broker_sync` PostgreSQL schema and a schema-local `SequelizeMeta` history table; Sequelize CLI creates the schema with its first migration.
- Set `META_API_ACCESS_TOKEN`, `META_API_REGION` and a stable `CREDENTIALS_ENCRYPTION_KEY` in `.env` before syncing. Generate the encryption key with `openssl rand -hex 32`, and back it up separately from the database. Never commit real credentials.
- Manual sync retrieves paginated history, deduplicates closing executions, generates charts with the existing per-user settings and stores them through trade-api in MinIO. Successful imports have durable receipts so subsequent syncs skip their candles and screenshots. The first sync imports all broker history available; subsequent syncs overlap the previous checkpoint by one day.
- Generated PNGs use TradingView Lightweight Charts in headless Chromium, installed in the broker image. One browser is started lazily per sync, charts render sequentially, and the browser closes after the job. Local runs require Chromium (`CHROMIUM_EXECUTABLE_PATH`, default `/usr/bin/chromium`). Existing stored PNGs are unchanged.
- TradingView Lightweight Charts: Copyright (c) 2025 TradingView, Inc. https://www.tradingview.com/ . Distributed under Apache-2.0; the library logo and chart attribution remain visible.
- Each job closes its RPC connection and requests undeployment in `finally`. Cleanup failures are displayed explicitly: check MetaApi and undeploy manually if warned. MetaApi hosting/deployment charges can still apply; this is not a promise of free service. No live MetaApi calls are made by automated tests.
- A process/host crash can bypass cleanup. An interrupted sync is reported on reopening the account; check the MetaApi dashboard for a deployed account in that case. Risk values derived from symbol tick values are estimates at sync time, not a reconstruction of historical currency conversion.
- Existing connected accounts should have their investor password added using Edit before the first MetaApi sync. Sync starts only when the user presses **Sync now**; tests never contact MetaApi.
- The frontend reads its Keycloak config (`KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`) from real container env vars at startup, not from the build — `Frontend/docker-entrypoint.d/40-generate-env.sh` renders `public/env.template.js` into `env.js` (loaded by `index.html` before the Angular bundle) using whatever values are set on the `frontend` service in `docker-compose.yml`. Change them there and restart the container; no rebuild needed.
