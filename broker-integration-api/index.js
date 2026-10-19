'use strict';

require('dotenv').config();

const app = require('./app');
const { sequelize } = require('./src/models');

const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 4000);

sequelize.authenticate()
  .then(() => {
    console.log('Broker sync database connection established.');
    app.listen(port, host, () => console.log(`Broker sync API running on http://${host}:${port}`));
  })
  .catch((err) => {
    console.error('Failed to start broker-integration-api:', err);
    process.exit(1);
  });