'use strict';

const KEYCLOAK_URL = process.env.KEYCLOAK_URL;
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM;
const BROKER_SYNC_API_URL = process.env.BROKER_SYNC_API_URL || 'http://broker-sync-api:4000';

let cachedToken = null;
let tokenExpiresAt = 0;

async function getServiceToken() {
  if (cachedToken && tokenExpiresAt > Date.now() + 30_000) return cachedToken;

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: 'trade-api',
    client_secret: process.env.TRADE_API_CLIENT_SECRET,
  });
  const response = await fetch(`${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`, {
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

async function request(path, options = {}) {
  const token = await getServiceToken();
  const response = await fetch(`${BROKER_SYNC_API_URL}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  if (response.status === 204) return null;
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`broker-sync-api request failed (${response.status}): ${result.message || 'unknown error'}`);
  return result;
}

exports.provisionConnection = (connection) => request('/internal/connections', {
  method: 'POST',
  body: JSON.stringify(connection),
});

exports.revokeConnection = (accountId) => request(`/internal/connections/${accountId}`, {
  method: 'DELETE',
});