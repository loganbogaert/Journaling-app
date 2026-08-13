'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const imageController = require('../controllers/imageController');

router.post('/trades/:tradeId/pictures/presigned-urls', auth, imageController.createUrls);
router.get('/trades/:tradeId/pictures/presigned-urls', auth, imageController.getUrls);
router.delete('/trades/:tradeId/pictures', auth, imageController.deleteObject);

module.exports = router;
