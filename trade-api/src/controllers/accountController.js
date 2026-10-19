'use strict';

const { Account } = require('../models');
const brokerSyncClient = require('../services/brokerSyncClient');

exports.create = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const {
      type, name, accountBalance, currency, startDate, endDate,
      platform, brokerServer, brokerLogin,
    } = req.body;

    const account = await Account.create({
      userId,
      type,
      name,
      accountBalance,
      currency,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      platform: platform ?? null,
      brokerServer: brokerServer ?? null,
      brokerLogin: brokerLogin ?? null,
      syncStatus: type === 'connected' ? 'pending' : null,
    });

    if (type !== 'connected') return res.status(201).json(account);

    try {
      const connection = await brokerSyncClient.provisionConnection({
        accountId: account.id,
        userId,
        platform,
        brokerServer,
        brokerLogin,
      });
      return res.status(201).json({ ...account.toJSON(), eaApiKey: connection.apiKey });
    } catch (err) {
      await brokerSyncClient.revokeConnection(account.id).catch(() => {});
      await account.destroy();
      err.status = 502;
      return next(err);
    }
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
    if (req.ownedAccount.type === 'connected') {
      await brokerSyncClient.revokeConnection(req.ownedAccount.id);
    }
    await req.ownedAccount.destroy();
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
};
