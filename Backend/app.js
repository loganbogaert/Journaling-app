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
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Internal Server Error' });
});

module.exports = app;
