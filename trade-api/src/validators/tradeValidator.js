'use strict';

const Joi = require('joi');

const price = Joi.number().positive();

const fields = {
  pairId: Joi.number().integer().positive(),
  entry: price,
  tp: price,
  sl: price,
  entryDate: Joi.date().iso(),
  exitDate: Joi.date().iso(),
  direction: Joi.string().valid('long', 'short'),
  risk: Joi.number().min(0),
  fee: Joi.number().min(0).allow(null).empty(''),
  profit: Joi.number().allow(null).empty(''),
  result: Joi.string().valid('W', 'BE', 'L'),
  notes: Joi.string().max(10000).allow(null, ''),
};

// The public API only ever creates manual trades, so tp/sl/risk are always mandatory here
exports.createTrade = Joi.object({
  accountId: Joi.number().integer().positive().required(),
  pairId: fields.pairId.required(),
  entry: fields.entry.required(),
  tp: fields.tp.required(),
  sl: fields.sl.required(),
  entryDate: fields.entryDate.required(),
  exitDate: fields.exitDate.required(),
  direction: fields.direction.required(),
  risk: fields.risk.required(),
  fee: fields.fee.default(0),
  profit: fields.profit,
  result: fields.result.required(),
  notes: fields.notes,
});

// Fields are optional on update, but tp/sl/risk can never be cleared (Joi rejects null for them)
exports.updateTrade = Joi.object(fields).min(1);
