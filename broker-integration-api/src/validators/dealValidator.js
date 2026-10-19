'use strict';

const Joi = require('joi');

const candle = Joi.object({
  time: Joi.number().integer().positive().required(),
  open: Joi.number().positive().required(),
  high: Joi.number().positive().required(),
  low: Joi.number().positive().required(),
  close: Joi.number().positive().required(),
  volume: Joi.number().min(0).required(),
});

module.exports = Joi.object({
  externalDealId: Joi.string().trim().min(1).max(64).required(),
  symbol: Joi.string().trim().min(1).max(255).required(),
  entry: Joi.number().positive().required(),
  exit: Joi.number().positive().required(),
  tp: Joi.number().positive().allow(null).required(),
  sl: Joi.number().positive().allow(null).required(),
  entryDate: Joi.date().iso().required(),
  exitDate: Joi.date().iso().required(),
  cursorTime: Joi.number().integer().min(0).required(),
  direction: Joi.string().valid('long', 'short').required(),
  risk: Joi.number().min(0).allow(null).required(),
  fee: Joi.number().required(),
  profit: Joi.number().required(),
  result: Joi.string().valid('W', 'BE', 'L').required(),
  candles: Joi.object({
    M1: Joi.array().items(candle).min(1).max(500),
    M5: Joi.array().items(candle).min(1).max(500),
    M15: Joi.array().items(candle).min(1).max(500),
    M30: Joi.array().items(candle).min(1).max(500),
    H1: Joi.array().items(candle).min(1).max(500),
    H4: Joi.array().items(candle).min(1).max(500),
    D1: Joi.array().items(candle).min(1).max(500),
  }).min(1).required(),
});