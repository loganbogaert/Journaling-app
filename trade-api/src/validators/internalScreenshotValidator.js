'use strict';

const Joi = require('joi');

module.exports = Joi.object({
  externalDealId: Joi.string().trim().min(1).max(64).required(),
  timeframe: Joi.string().valid('M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1').required(),
  imageBase64: Joi.string().pattern(/^[A-Za-z0-9+/]+={0,2}$/).max(1500000).required(),
});