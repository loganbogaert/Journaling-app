'use strict';

const { Account } = require('../models');

exports.create = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { type, name, accountBalance, currency, startDate, endDate } = req.body;

    const account = await Account.create({
      userId,
      type,
      name,
      accountBalance,
      currency,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
    });

    return res.status(201).json(account);
  } catch (err) {
    next(err);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const accounts = await Account.findAll({ where: { userId }, order: [['createdAt', 'ASC']] });
    return res.status(200).json(accounts);
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    return res.status(200).json(req.ownedAccount);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    // req.body is already whitelisted by the updateAccount schema
    await req.ownedAccount.update(req.body);
    return res.status(200).json(req.ownedAccount);
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    await req.ownedAccount.destroy();
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
};
