'use strict';

const Joi = require('joi');

module.exports = Joi.object({
  accountId: Joi.number().integer().positive().required(),
  pairId: Joi.number().integer().positive().required(),
  externalDealId: Joi.string().trim().min(1).max(64).required(),
  entry: Joi.number().positive().required(),
  tp: Joi.number().positive().allow(null).required(),
  sl: Joi.number().positive().allow(null).required(),
  entryDate: Joi.date().iso().required(),
  exitDate: Joi.date().iso().required(),
  direction: Joi.string().valid('long', 'short').required(),
  risk: Joi.number().min(0).allow(null).required(),
  fee: Joi.number().required(),
  profit: Joi.number().required(),
  result: Joi.string().valid('W', 'BE', 'L').required(),
});