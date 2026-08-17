'use strict';

const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// Internal, container-to-container URL used to fetch signing keys (fast, no public exposure).
const KEYCLOAK_URL = process.env.KEYCLOAK_URL;
// Public-facing URL (as seen by the browser, through Kong) — must match the token's `iss`
// claim, which Keycloak stamps using the Host it was reached on, not its internal address.
const KEYCLOAK_ISSUER_URL = process.env.KEYCLOAK_ISSUER_URL || KEYCLOAK_URL;
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM;

// Keycloak's realm signing keys, fetched (and cached) from its JWKS endpoint. Even though
// Kong already authenticates the request, the backend independently re-verifies the token
// signature/expiry so it never has to fully trust the network path alone.
const client = jwksClient({
  jwksUri: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`,
  cache: true,
  cacheMaxAge: 10 * 60 * 1000,
  rateLimit: true,
});

function getSigningKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

// Verifies the Keycloak access token and attaches the authenticated user's subject id
// (used as the owner reference on Sessions from now on) and realm roles to the request.
const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(
    token,
    getSigningKey,
    {
      algorithms: ['RS256'],
      issuer: `${KEYCLOAK_ISSUER_URL}/realms/${KEYCLOAK_REALM}`,
    },
    (err, decoded) => {
      if (err) return res.status(401).json({ message: 'Invalid or expired token' });

      req.user = {
        userId: decoded.sub,
        email: decoded.email,
        roles: decoded.realm_access?.roles || [],
      };
      next();
    }
  );
};

module.exports = auth;
