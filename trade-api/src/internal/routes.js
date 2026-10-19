'use strict';

const express = require('express');
const validate = require('../middleware/validate');
const serviceAuth = require('../middleware/serviceAuth');
const tradeController = require('./tradeController');
const tradeSchema = require('../validators/internalTradeValidator');

const router = express.Router();

router.post('/trades', serviceAuth('trades:write'), validate(tradeSchema), tradeController.ingest);

module.exports = router;