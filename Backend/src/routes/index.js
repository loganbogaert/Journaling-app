'use strict';

const express = require('express');
const router = express.Router();

router.use(require('./authRoutes'));
router.use(require('./sessionRoutes'));
router.use(require('./pairRoutes'));
router.use(require('./tradeRoutes'));
router.use(require('./tradePictureRoutes'));
router.use(require('./imagesRoutes'));

module.exports = router;
