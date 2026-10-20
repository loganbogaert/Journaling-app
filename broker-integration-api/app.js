'use strict';

const express = require('express');
const internalRoutes = require('./src/routes/internalRoutes');
const publicRoutes = require('./src/routes/publicRoutes');

const app = express();

app.use(express.json({ limit: '2mb' }));
app.use('/internal', internalRoutes);
app.use('/', publicRoutes);
app.use((err, req, res, next) => {
  console.error(`[${req.method} ${req.originalUrl}] request failed (${err.name || 'Error'})`);
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({ message: err.errors.map((error) => error.message).join('; ') });
  }
  res.status(err.status || 500).json({ message: 'Broker integration request failed' });
});

module.exports = app;