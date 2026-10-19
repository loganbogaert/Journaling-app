'use strict';

const { createServiceClient } = require('@trading-journal/shared');

const client = createServiceClient({
  baseUrl: process.env.TRADE_API_INTERNAL_URL || 'http://trade-api:3001',
  keycloakUrl: process.env.KEYCLOAK_URL,
  realm: process.env.KEYCLOAK_REALM,
  clientId: 'broker-integration-api',
  clientSecret: process.env.BROKER_INTEGRATION_CLIENT_SECRET,
});

exports.ingestTrade = (trade) => client.request('/trades', {
  method: 'POST',
  body: JSON.stringify(trade),
});

exports.getScreenshotSettings = (accountId) => client.request(`/accounts/${accountId}/screenshot-settings`);

exports.storeScreenshot = (tradeId, screenshot) => client.request(`/trades/${tradeId}/pictures`, {
  method: 'POST',
  body: JSON.stringify(screenshot),
});