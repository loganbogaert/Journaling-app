'use strict';

const express = require('express');
const accountKeyAuth = require('../middleware/accountKeyAuth');

const router = express.Router();

router.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));
router.post('/ingest', accountKeyAuth, (req, res) => {
  res.status(503).json({ message: 'Trade ingestion will be enabled in the next sync phase' });
});

module.exports = router;