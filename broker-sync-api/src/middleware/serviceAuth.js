'use strict';

const { createServiceAuth } = require('@trading-journal/shared');
const verifyToken = require('./verifyKeycloakToken');
const manifest = Object.freeze({
  'trade-api': Object.freeze(['connections:write', 'connections:delete']),
});

module.exports = createServiceAuth({ verifyToken, audience: 'broker-sync-api', manifest });