'use strict';

const express = require('express');
const cors = require('cors');
const gateway = require('./src/middleware/gateway');
const routes = require('./src/routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(gateway);

app.use('/', routes);

// Global error handler
app.use((err, req, res, next) => {
  // Log full error server-side (visible via `docker logs`) since the client only gets the message
  console.error(`[${req.method} ${req.originalUrl}]`, err);
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({ message: err.errors.map((e) => e.message).join('; ') });
  }
  // 23514 = Postgres check_violation (e.g. a manual trade missing tp/sl/risk)
  if (err.parent?.code === '23514') {
    return res.status(400).json({ message: 'Trade violates a data constraint' });
  }
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Internal Server Error' });
});

module.exports = app;
