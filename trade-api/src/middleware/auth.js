'use strict';

const jwt = require('jsonwebtoken');
const verifyKeycloakToken = require('./verifyKeycloakToken');

const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM;

// Verifies the Keycloak access token and attaches the authenticated user's subject id
// (used as the owner reference on Accounts from now on) and realm roles to the request.
const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];
  verifyKeycloakToken(token, {}, (err, decoded) => {
      if (err) return res.status(401).json({ message: 'Invalid or expired token' });

      req.user = {
        userId: decoded.sub,
        email: decoded.email,
        roles: decoded.realm_access?.roles || [],
      };
      next();
    });
};

module.exports = auth;
