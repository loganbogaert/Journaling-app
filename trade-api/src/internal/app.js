'use strict';

const express = require('express');
const routes = require('./routes');

const app = express();

app.use(express.json({ limit: '5mb' }));
app.use('/', routes);
app.use((err, req, res, next) => {
  console.error(`[internal ${req.method} ${req.originalUrl}]`, err);
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({ message: err.errors.map((e) => e.message).join('; ') });
  }
  if (err.parent?.code === '23514') {
    return res.status(400).json({ message: 'Trade violates a data constraint' });
  }
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

module.exports = app;