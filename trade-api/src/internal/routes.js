'use strict';

const express = require('express');
const validate = require('../middleware/validate');
const serviceAuth = require('../middleware/serviceAuth');
const tradeController = require('./tradeController');
const tradeSchema = require('../validators/internalTradeValidator');
const screenshotController = require('./screenshotController');
const screenshotSchema = require('../validators/internalScreenshotValidator');
const screenshotSettingsController = require('../controllers/screenshotSettingsController');
const screenshotSettingsSchema = require('../validators/screenshotSettingsValidator');

const router = express.Router();

router.post('/trades', serviceAuth('trades:write'), validate(tradeSchema), tradeController.ingest);
router.get('/accounts/:accountId/screenshot-settings', serviceAuth('settings:read'), screenshotSettingsController.getForAccount);
router.post('/trades/:tradeId/pictures', serviceAuth('pictures:write'), validate(screenshotSchema), screenshotController.store);

module.exports = router;