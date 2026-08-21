'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const pairController = require('../controllers/pairController');

// Pairs are shared reference data — only admins may add/remove them
router.post('/pairs', auth, requireRole('admin'), pairController.create);
router.get('/pairs', auth, pairController.getAll);
router.delete('/pairs/:id', auth, requireRole('admin'), pairController.delete);

module.exports = router;

