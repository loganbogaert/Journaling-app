'use strict';

const Joi = require('joi');

exports.create = Joi.object({
  accountId: Joi.number().integer().positive().required(),
  userId: Joi.string().guid({ version: ['uuidv4', 'uuidv5'] }).required(),
  platform: Joi.string().valid('mt4', 'mt5').required(),
  brokerLogin: Joi.string().trim().min(1).max(64).required(),
  brokerServer: Joi.string().trim().min(1).max(255).required(),
});

exports.accountId = Joi.object({ accountId: Joi.number().integer().positive().required() });