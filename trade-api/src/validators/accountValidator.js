'use strict';

const Joi = require('joi');

const optionalDate = Joi.date().iso().allow(null).empty('');

const fields = {
  name: Joi.string().trim().min(1).max(255),
  accountBalance: Joi.number().min(0),
  currency: Joi.string().trim().uppercase().length(3),
  startDate: optionalDate,
  endDate: optionalDate,
};

// Only manual accounts can be created until broker sync is wired up
exports.createAccount = Joi.object({
  type: Joi.string().valid('manual').default('manual'),
  name: fields.name.required(),
  accountBalance: fields.accountBalance.required(),
  currency: fields.currency.required(),
  startDate: fields.startDate,
  endDate: fields.endDate,
});

exports.updateAccount = Joi.object(fields).min(1);
