'use strict';

const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const KEYCLOAK_URL = process.env.KEYCLOAK_URL;
const KEYCLOAK_ISSUER_URL = process.env.KEYCLOAK_ISSUER_URL || KEYCLOAK_URL;
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM;

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

module.exports = (token, options, callback) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  jwt.verify(token, getSigningKey, {
    algorithms: ['RS256'],
    issuer: `${KEYCLOAK_ISSUER_URL}/realms/${KEYCLOAK_REALM}`,
    ...options,
  }, callback);
};