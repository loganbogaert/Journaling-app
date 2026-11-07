'use strict';

require('dotenv').config();

const config = require('@trading-journal/shared').createDatabaseConfig();

for (const environment of Object.keys(config)) {
	config[environment] = {
		...config[environment],
		migrationStorageTableSchema: 'broker_sync',
	};
}

module.exports = config;