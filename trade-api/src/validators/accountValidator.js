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

exports.createAccount = Joi.object({
  type: Joi.string().valid('manual', 'connected').default('manual'),
  name: fields.name.required(),
  accountBalance: fields.accountBalance.required(),
  currency: fields.currency.required(),
  startDate: fields.startDate,
  endDate: fields.endDate,
  platform: Joi.when('type', {
    is: 'connected',
    then: Joi.string().valid('mt4', 'mt5').required(),
    otherwise: Joi.forbidden(),
  }),
  brokerServer: Joi.when('type', {
    is: 'connected',
    then: Joi.string().trim().min(1).max(255).required(),
    otherwise: Joi.forbidden(),
  }),
  brokerLogin: Joi.when('type', {
    is: 'connected',
    then: Joi.string().trim().min(1).max(64).required(),
    otherwise: Joi.forbidden(),
  }),
  investorPassword: Joi.when('type', {
    is: 'connected', then: Joi.string().min(1).max(256).required(), otherwise: Joi.forbidden(),
  }),
});

exports.updateAccount = Joi.object({ ...fields, investorPassword: Joi.string().min(1).max(256) }).min(1);
