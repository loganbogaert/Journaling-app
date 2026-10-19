'use strict';

const { Account, Pair, Trade } = require('../models');

exports.ingest = async (req, res, next) => {
  try {
    const { accountId, pairId, ...tradeData } = req.body;
    const account = await Account.findByPk(accountId);
    if (!account || account.type !== 'connected') {
      return res.status(404).json({ message: 'Connected account not found' });
    }

    if (account.syncStatus === 'disabled') {
      return res.status(409).json({ message: 'Account synchronization is disabled' });
    }

    const pair = await Pair.findByPk(pairId);
    if (!pair) return res.status(404).json({ message: 'Pair not found' });

    const [trade, created] = await Trade.findOrCreate({
      where: { accountId, externalDealId: tradeData.externalDealId },
      defaults: {
        ...tradeData,
        accountId,
        pairId,
        source: 'sync',
      },
    });

    return res.status(created ? 201 : 200).json({ trade, created });
  } catch (err) {
    next(err);
  }
};