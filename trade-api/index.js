'use strict';

require('dotenv').config();

const app = require('./app');
const db = require('./src/models');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

db.sequelize
  .authenticate()
  .then(() => {
    console.log('Database connection established.');
    app.listen(PORT, HOST, () => {
      console.log(`Server running on http://${HOST}:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start:', err);
    process.exit(1);
  });
