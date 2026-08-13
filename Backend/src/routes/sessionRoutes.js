'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const sessionController = require('../controllers/sessionController');

router.post('/sessions', auth, sessionController.create);
router.get('/sessions', auth, sessionController.getAll);
router.get('/sessions/:id', auth, sessionController.getById);
router.put('/sessions/:id', auth, sessionController.update);
router.delete('/sessions/:id', auth, sessionController.delete);

module.exports = router;
