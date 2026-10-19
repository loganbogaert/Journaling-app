'use strict';

const { createServiceClient } = require('@trading-journal/shared');
const client = createServiceClient({
  baseUrl: process.env.BROKER_SYNC_API_URL || 'http://broker-sync-api:4000',
  keycloakUrl: process.env.KEYCLOAK_URL,
  realm: process.env.KEYCLOAK_REALM,
  clientId: 'trade-api',
  clientSecret: process.env.TRADE_API_CLIENT_SECRET,
});

exports.provisionConnection = (connection) => client.request('/internal/connections', {
  method: 'POST',
  body: JSON.stringify(connection),
});

exports.revokeConnection = (accountId) => client.request(`/internal/connections/${accountId}`, {
  method: 'DELETE',
});