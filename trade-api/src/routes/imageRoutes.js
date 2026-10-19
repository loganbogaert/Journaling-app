'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const imageController = require('../controllers/imageController');

router.post('/trades/:tradeId/pictures/presigned-urls', auth, imageController.createUrls);


module.exports = router;
