'use strict';

const Joi = require('joi');

module.exports = Joi.object({
  timeframes: Joi.array()
    .items(Joi.string().valid('M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'))
    .min(1)
    .unique()
    .required(),
  candleCount: Joi.number().integer().min(50).max(500).required(),
});