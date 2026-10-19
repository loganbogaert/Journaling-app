'use strict';

const { createServiceClient } = require('@trading-journal/shared');

const client = createServiceClient({
  baseUrl: process.env.TRADE_API_INTERNAL_URL || 'http://trade-api:3001',
  keycloakUrl: process.env.KEYCLOAK_URL,
  realm: process.env.KEYCLOAK_REALM,
  clientId: 'broker-sync-api',
  clientSecret: process.env.BROKER_SYNC_CLIENT_SECRET,
});

exports.ingestTrade = (trade) => client.request('/trades', {
  method: 'POST',
  body: JSON.stringify(trade),
});