#!/bin/sh
set -eu

# Regenerates env.js from the container's real environment at startup, so Keycloak config
# can be changed per-deployment without rebuilding the Angular app.
envsubst '${KEYCLOAK_URL} ${KEYCLOAK_REALM} ${KEYCLOAK_CLIENT_ID}' \
  < /usr/share/nginx/html/env.template.js \
  > /usr/share/nginx/html/env.js
