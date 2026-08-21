'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireOwnSession } = require('../middleware/ownership');
const sessionController = require('../controllers/sessionController');

router.post('/sessions', auth, sessionController.create);
router.get('/sessions', auth, sessionController.getAll);
router.get('/sessions/:id', auth, requireOwnSession('id'), sessionController.getById);
router.put('/sessions/:id', auth, requireOwnSession('id'), sessionController.update);
router.delete('/sessions/:id', auth, requireOwnSession('id'), sessionController.delete);

module.exports = router;

