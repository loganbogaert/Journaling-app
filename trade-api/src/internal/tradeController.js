'use strict';

const { Account, Pair, Trade } = require('../models');

exports.ingest = async (req, res, next) => {
  try {
    const { accountId, symbol, currency, ...tradeData } = req.body;
    const account = await Account.findByPk(accountId);
    if (!account || account.type !== 'connected') {
      return res.status(404).json({ message: 'Connected account not found' });
    }

    if (account.syncStatus === 'disabled') {
      return res.status(409).json({ message: 'Account synchronization is disabled' });
    }

    if (String(account.currency).trim().toUpperCase() !== currency) {
      return res.status(409).json({
        message: `Broker account uses ${currency}, but the journal account uses ${account.currency}. Their currencies must match before importing.`,
      });
    }

    const [pair] = await Pair.findOrCreate({ where: { pair: symbol }, defaults: { pair: symbol } });

    const [trade, created] = await Trade.findOrCreate({
      where: { accountId, externalDealId: tradeData.externalDealId },
      defaults: {
        ...tradeData,
        accountId,
        pairId: pair.id,
        source: 'sync',
      },
    });

    return res.status(created ? 201 : 200).json({ trade, created });
  } catch (err) {
    next(err);
  }
};