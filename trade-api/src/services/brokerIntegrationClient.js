'use strict';

const { createServiceClient } = require('@trading-journal/shared');
const client = createServiceClient({
  baseUrl: process.env.BROKER_INTEGRATION_API_URL || 'http://broker-integration-api:4000',
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

exports.storeScreenshot = (tradeId, screenshot) => client.request(`/internal/trades/${tradeId}/pictures`, {
  method: 'POST',
  body: JSON.stringify(screenshot),
});