'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pairController = require('../controllers/pairController');

router.post('/pairs', auth, pairController.create);
router.get('/pairs', auth, pairController.getAll);
router.delete('/pairs/:id', auth, pairController.delete);

module.exports = router;
