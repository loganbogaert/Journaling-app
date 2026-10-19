'use strict';

const express = require('express');
const accountKeyAuth = require('../middleware/accountKeyAuth');
const validate = require('../middleware/validate');
const dealSchema = require('../validators/dealValidator');
const dealController = require('../controllers/dealController');

const router = express.Router();

router.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));
router.get('/cursor', accountKeyAuth, dealController.getCursor);
router.post('/ingest', accountKeyAuth, validate(dealSchema), dealController.ingest);

module.exports = router;