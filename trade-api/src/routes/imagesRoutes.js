'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireOwnTrade } = require('../middleware/ownership');
const imageController = require('../controllers/imageController');

router.post('/trades/:tradeId/pictures/presigned-urls', auth, requireOwnTrade('tradeId'), imageController.createUrls);
router.get('/trades/:tradeId/pictures/presigned-urls', auth, requireOwnTrade('tradeId'), imageController.getUrls);
router.delete('/trades/:tradeId/pictures', auth, requireOwnTrade('tradeId'), imageController.deleteObject);

module.exports = router;

