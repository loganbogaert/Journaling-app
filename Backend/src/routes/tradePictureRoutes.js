'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireOwnTrade, requireOwnTradePicture } = require('../middleware/ownership');
const tradePictureController = require('../controllers/tradePictureController');

router.post('/trades/:tradeId/pictures', auth, requireOwnTrade('tradeId'), tradePictureController.add);
router.get('/trades/:tradeId/pictures', auth, requireOwnTrade('tradeId'), tradePictureController.getAll);
router.delete('/trade-pictures/:id', auth, requireOwnTradePicture('id'), tradePictureController.delete);

module.exports = router;

