'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireOwnSession, requireOwnTrade } = require('../middleware/ownership');
const tradeController = require('../controllers/tradeController');

router.post('/trades', auth, requireOwnSession('sessionId', { from: 'body' }), tradeController.create);
router.get('/sessions/:sessionId/trades', auth, requireOwnSession('sessionId'), tradeController.getBySession);
router.get('/trades/:id', auth, requireOwnTrade('id'), tradeController.getById);
router.put('/trades/:id', auth, requireOwnTrade('id'), tradeController.update);
router.delete('/trades/:id', auth, requireOwnTrade('id'), tradeController.delete);

module.exports = router;

