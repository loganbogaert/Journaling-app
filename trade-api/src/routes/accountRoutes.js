'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { requireOwnAccount } = require('../middleware/ownership');
const { createAccount, updateAccount } = require('../validators/accountValidator');
const accountController = require('../controllers/accountController');

router.post('/accounts', auth, validate(createAccount), accountController.create);
router.get('/accounts', auth, accountController.getAll);
router.get('/accounts/:id', auth, requireOwnAccount('id'), accountController.getById);
router.put('/accounts/:id', auth, requireOwnAccount('id'), validate(updateAccount), accountController.update);
router.delete('/accounts/:id', auth, requireOwnAccount('id'), accountController.delete);

module.exports = router;
