'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const tradePictureController = require('../controllers/tradePictureController');

router.post('/trades/:tradeId/pictures', auth, tradePictureController.add);
router.get('/trades/:tradeId/pictures', auth, tradePictureController.getAll);
router.delete('/trade-pictures/:id', auth, tradePictureController.delete);

module.exports = router;
