'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const tradeController = require('../controllers/tradeController');

router.post('/trades', auth, tradeController.create);
router.get('/sessions/:sessionId/trades', auth, tradeController.getBySession);
router.get('/trades/:id', auth, tradeController.getById);
router.put('/trades/:id', auth, tradeController.update);
router.delete('/trades/:id', auth, tradeController.delete);

module.exports = router;
