'use strict';

function createKeycloakTokenVerifier({ jwt, jwksClient, keycloakUrl, issuerUrl, realm }) {
  const jwks = jwksClient({
    jwksUri: `${keycloakUrl}/realms/${realm}/protocol/openid-connect/certs`,
    cache: true,
    cacheMaxAge: 10 * 60 * 1000,
    rateLimit: true,
  });

  function getSigningKey(header, callback) {
    jwks.getSigningKey(header.kid, (err, key) => {
      if (err) return callback(err);
      callback(null, key.getPublicKey());
    });
  }

  return (token, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    const issuers = [
      `${issuerUrl}/realms/${realm}`,
      ...(options.allowInternalIssuer ? [`${keycloakUrl}/realms/${realm}`] : []),
    ];
    const { allowInternalIssuer, ...verifyOptions } = options;
    jwt.verify(token, getSigningKey, {
      algorithms: ['RS256'],
      issuer: [...new Set(issuers)],
      ...verifyOptions,
    }, callback);
  };
}

function createServiceAuth({ verifyToken, audience, manifest }) {
  return (permission) => (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing or invalid authorization header' });
    }

    verifyToken(authHeader.slice(7), { audience, allowInternalIssuer: true }, (err, decoded) => {
      if (err) return res.status(401).json({ message: 'Invalid or expired service token' });

      const clientId = decoded.azp;
      const permissions = manifest[clientId];
      if (!permissions || !permissions.includes(permission)) {
        return res.status(403).json({ message: 'Service is not authorized for this operation' });
      }

      req.service = { clientId, permissions };
      next();
    });
  };
}

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({ message: error.details.map((detail) => detail.message).join('; ') });
    }
    req[source] = value;
    next();
  };
}

function createDatabaseConfig() {
  const common = {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    dialect: process.env.DB_DIALECT || 'postgres',
    logging: false,
  };
  return {
    development: common,
    test: { ...common, database: process.env.DB_NAME_TEST || `${common.database}_test` },
    production: {
      ...common,
      dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    },
  };
}

function createServiceClient({ baseUrl, keycloakUrl, realm, clientId, clientSecret }) {
  let cachedToken;
  let tokenExpiresAt = 0;

  async function getToken() {
    if (cachedToken && tokenExpiresAt > Date.now() + 30_000) return cachedToken;

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    });
    const response = await fetch(`${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!response.ok) throw new Error(`Keycloak service-token request failed (${response.status})`);

    const token = await response.json();
    cachedToken = token.access_token;
    tokenExpiresAt = Date.now() + token.expires_in * 1000;
    return cachedToken;
  }

  return {
    async request(path, options = {}) {
      const token = await getToken();
      const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
          authorization: `Bearer ${token}`,
          ...(options.body ? { 'content-type': 'application/json' } : {}),
          ...options.headers,
        },
      });
      if (response.status === 204) return null;
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(`Service request failed (${response.status}): ${body.message || 'unknown error'}`);
      return body;
    },
  };
}

module.exports = {
  createDatabaseConfig,
  createKeycloakTokenVerifier,
  createServiceClient,
  createServiceAuth,
  validate,
};