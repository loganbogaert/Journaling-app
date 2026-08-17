// Fallback used during local `ng serve` (no Docker entrypoint script runs). In the built
// Docker image, this file is regenerated from env.template.js at container startup using
// real environment variables — see Frontend/docker-entrypoint.d/40-generate-env.sh.
window.__env = {
  KEYCLOAK_URL: '/auth',
  KEYCLOAK_REALM: 'trading-journal',
  KEYCLOAK_CLIENT_ID: 'trading-journal-frontend',
};
