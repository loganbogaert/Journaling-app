'use strict';

const verifyKeycloakToken = require('./verifyKeycloakToken');
const serviceManifest = require('../internal/serviceManifest');
const KEYCLOAK_URL = process.env.KEYCLOAK_URL;
const KEYCLOAK_ISSUER_URL = process.env.KEYCLOAK_ISSUER_URL || KEYCLOAK_URL;
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM;

const allowedIssuers = [...new Set([
  `${KEYCLOAK_ISSUER_URL}/realms/${KEYCLOAK_REALM}`,
  `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`,
])];

module.exports = (permission) => (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid authorization header' });
  }

  verifyKeycloakToken(authHeader.slice(7), {
    audience: 'trade-api',
    issuer: allowedIssuers,
  }, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Invalid or expired service token' });

    const clientId = decoded.azp;
    const permissions = serviceManifest[clientId];
    if (!permissions || !permissions.includes(permission)) {
      return res.status(403).json({ message: 'Service is not authorized for this operation' });
    }

    req.service = { clientId, permissions };
    next();
  });
};