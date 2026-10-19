'use strict';

const { Account } = require('../models');
const brokerIntegrationClient = require('../services/brokerIntegrationClient');

exports.create = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const {
      type, name, accountBalance, currency, startDate, endDate,
      platform, brokerServer, brokerLogin, investorPassword,
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
      await brokerIntegrationClient.provisionConnection({
        accountId: account.id,
        userId,
        platform,
        brokerServer,
        brokerLogin,
        investorPassword,
      });
      return res.status(201).json(account);
    } catch (err) {
      await brokerIntegrationClient.revokeConnection(account.id).catch(() => {});
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
    const { investorPassword, ...fields } = req.body;
    if (investorPassword) {
      if (req.ownedAccount.type !== 'connected') return res.status(400).json({ message: 'Manual accounts do not have broker credentials' });
      const account = req.ownedAccount;
      await brokerIntegrationClient.provisionConnection({
        accountId: account.id, userId: account.userId, platform: account.platform,
        brokerServer: account.brokerServer, brokerLogin: account.brokerLogin, investorPassword,
      });
    }
    await req.ownedAccount.update(fields);
    return res.status(200).json(req.ownedAccount);
  } catch (err) {
    next(err);
  }
};

exports.sync = async (req, res, next) => {
  try {
    if (req.ownedAccount.type !== 'connected') return res.status(400).json({ message: 'Only connected accounts can sync' });
    const status = await brokerIntegrationClient.startSync(req.ownedAccount.id);
    await req.ownedAccount.update({ syncStatus: 'pending' });
    return res.status(202).json(status);
  } catch (err) { next(err); }
};

exports.syncStatus = async (req, res, next) => {
  try {
    if (req.ownedAccount.type !== 'connected') return res.status(400).json({ message: 'Only connected accounts can sync' });
    const status = await brokerIntegrationClient.syncStatus(req.ownedAccount.id);
    if (status.state !== 'syncing') {
      await req.ownedAccount.update({ syncStatus: status.state === 'failed' ? 'error' : 'active', lastSyncedAt: status.lastSyncedAt });
    }
    return res.json(status);
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    if (req.ownedAccount.type === 'connected') {
      await brokerIntegrationClient.revokeConnection(req.ownedAccount.id);
    }
    await req.ownedAccount.destroy();
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
};
