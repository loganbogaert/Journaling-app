'use strict';

const express = require('express');
const serviceAuth = require('../middleware/serviceAuth');
const validate = require('../middleware/validate');
const schema = require('../validators/connectionValidator');
const controller = require('../controllers/connectionController');

const router = express.Router();

router.post('/connections', serviceAuth('connections:write'), validate(schema.create), controller.provision);
router.delete('/connections/:accountId', serviceAuth('connections:delete'), validate(schema.accountId, 'params'), controller.revoke);

module.exports = router;