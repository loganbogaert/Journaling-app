'use strict';

require('dotenv').config();

const app = require('./app');
const internalApp = require('./src/internal/app');
const db = require('./src/models');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const INTERNAL_PORT = process.env.INTERNAL_PORT || 3001;
const INTERNAL_HOST = process.env.INTERNAL_HOST || '0.0.0.0';

db.sequelize
  .authenticate()
  .then(() => {
    console.log('Database connection established.');
    app.listen(PORT, HOST, () => {
      console.log(`Server running on http://${HOST}:${PORT}`);
    });
    internalApp.listen(INTERNAL_PORT, INTERNAL_HOST, () => {
      console.log(`Internal API running on http://${INTERNAL_HOST}:${INTERNAL_PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start:', err);
    process.exit(1);
  });
