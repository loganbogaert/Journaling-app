'use strict';

const { Account, Trade, TradePicture } = require('../models');

function forbidden() {
  const err = new Error('Unauthorized');
  err.status = 403;
  return err;
}

function notFound(message) {
  const err = new Error(message);
  err.status = 404;
  return err;
}

async function assertAccountOwnership(accountId, userId) {
  const account = await Account.findByPk(accountId);
  if (!account) throw notFound('Account not found');
  if (String(account.userId) !== String(userId)) throw forbidden();
  return account;
}

async function assertTradeOwnership(tradeId, userId) {
  const trade = await Trade.findByPk(tradeId);
  if (!trade) throw notFound('Trade not found');
  const account = await assertAccountOwnership(trade.accountId, userId);
  return { trade, account };
}

// Loads the Account identified by req[from][paramName] and verifies the authenticated user
// owns it, attaching it as req.ownedAccount. Must run after the `auth` middleware.
const requireOwnAccount = (paramName = 'id', { from = 'params' } = {}) => async (req, res, next) => {
  try {
    req.ownedAccount = await assertAccountOwnership(req[from][paramName], req.user.userId);
    next();
  } catch (err) {
    next(err);
  }
};

// Loads the Trade identified by req[from][paramName] plus its owning Account, verifying
// ownership, attaching them as req.ownedTrade / req.ownedAccount.
const requireOwnTrade = (paramName = 'id', { from = 'params' } = {}) => async (req, res, next) => {
  try {
    const { trade, account } = await assertTradeOwnership(req[from][paramName], req.user.userId);
    req.ownedTrade = trade;
    req.ownedAccount = account;
    next();
  } catch (err) {
    next(err);
  }
};

// Loads the TradePicture identified by req.params[paramName], plus its Trade/Account,
// verifying ownership, attaching them as req.ownedPicture / req.ownedTrade / req.ownedAccount.
const requireOwnTradePicture = (paramName = 'id') => async (req, res, next) => {
  try {
    const picture = await TradePicture.findByPk(req.params[paramName]);
    if (!picture) throw notFound('Trade picture not found');

    const { trade, account } = await assertTradeOwnership(picture.tradeId, req.user.userId);
    req.ownedPicture = picture;
    req.ownedTrade = trade;
    req.ownedAccount = account;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireOwnAccount, requireOwnTrade, requireOwnTradePicture };
