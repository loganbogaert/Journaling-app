'use strict';

const { createKeycloakTokenVerifier } = require('@trading-journal/shared');

module.exports = createKeycloakTokenVerifier({
  jwt: require('jsonwebtoken'),
  jwksClient: require('jwks-rsa'),
  keycloakUrl: process.env.KEYCLOAK_URL,
  issuerUrl: process.env.KEYCLOAK_ISSUER_URL || process.env.KEYCLOAK_URL,
  realm: process.env.KEYCLOAK_REALM,
});