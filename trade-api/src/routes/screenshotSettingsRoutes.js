'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const schema = require('../validators/screenshotSettingsValidator');
const controller = require('../controllers/screenshotSettingsController');

const router = express.Router();

router.get('/settings/screenshots', auth, controller.getMine);
router.put('/settings/screenshots', auth, validate(schema), controller.updateMine);

module.exports = router;