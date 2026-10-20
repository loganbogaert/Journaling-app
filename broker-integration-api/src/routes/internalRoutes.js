'use strict';

const express = require('express');
const serviceAuth = require('../middleware/serviceAuth');
const validate = require('../middleware/validate');
const schema = require('../validators/connectionValidator');
const controller = require('../controllers/connectionController');
const syncController = require('../controllers/syncController');

const router = express.Router();

router.post('/connections', serviceAuth('connections:write'), validate(schema.create), controller.provision);
router.post('/connections/:accountId/sync', serviceAuth('connections:sync'), validate(schema.accountId, 'params'), syncController.start);
router.get('/connections/:accountId/sync', serviceAuth('connections:sync'), validate(schema.accountId, 'params'), syncController.status);
router.delete('/connections/:accountId', serviceAuth('connections:delete'), validate(schema.accountId, 'params'), controller.revoke);

module.exports = router;