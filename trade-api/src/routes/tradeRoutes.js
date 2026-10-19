'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { requireOwnAccount, requireOwnTrade } = require('../middleware/ownership');
const { createTrade, updateTrade } = require('../validators/tradeValidator');
const tradeController = require('../controllers/tradeController');

router.post('/trades', auth, validate(createTrade), requireOwnAccount('accountId', { from: 'body' }), tradeController.create);
router.get('/accounts/:accountId/trades', auth, requireOwnAccount('accountId'), tradeController.getByAccount);
router.get('/trades/:id', auth, requireOwnTrade('id'), tradeController.getById);
router.put('/trades/:id', auth, requireOwnTrade('id'), validate(updateTrade), tradeController.update);
router.delete('/trades/:id', auth, requireOwnTrade('id'), tradeController.delete);

module.exports = router;
