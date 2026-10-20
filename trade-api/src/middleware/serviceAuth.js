'use strict';

const { createServiceAuth } = require('@trading-journal/shared');
const serviceManifest = require('../internal/serviceManifest');
const verifyKeycloakToken = require('./verifyKeycloakToken');

module.exports = createServiceAuth({
	verifyToken: verifyKeycloakToken,
	audience: 'trade-api',
	manifest: serviceManifest,
});