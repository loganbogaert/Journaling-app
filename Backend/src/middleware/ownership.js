'use strict';

const { Session, Trade, TradePicture } = require('../models');

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

async function assertSessionOwnership(sessionId, userId) {
  const session = await Session.findByPk(sessionId);
  if (!session) throw notFound('Session not found');
  if (String(session.userId) !== String(userId)) throw forbidden();
  return session;
}

async function assertTradeOwnership(tradeId, userId) {
  const trade = await Trade.findByPk(tradeId);
  if (!trade) throw notFound('Trade not found');
  const session = await assertSessionOwnership(trade.sessionId, userId);
  return { trade, session };
}

// Loads the Session identified by req[from][paramName] and verifies the authenticated user
// owns it, attaching it as req.ownedSession. Must run after the `auth` middleware.
const requireOwnSession = (paramName = 'id', { from = 'params' } = {}) => async (req, res, next) => {
  try {
    req.ownedSession = await assertSessionOwnership(req[from][paramName], req.user.userId);
    next();
  } catch (err) {
    next(err);
  }
};

// Loads the Trade identified by req[from][paramName] plus its owning Session, verifying
// ownership, attaching them as req.ownedTrade / req.ownedSession.
const requireOwnTrade = (paramName = 'id', { from = 'params' } = {}) => async (req, res, next) => {
  try {
    const { trade, session } = await assertTradeOwnership(req[from][paramName], req.user.userId);
    req.ownedTrade = trade;
    req.ownedSession = session;
    next();
  } catch (err) {
    next(err);
  }
};

// Loads the TradePicture identified by req.params[paramName], plus its Trade/Session,
// verifying ownership, attaching them as req.ownedPicture / req.ownedTrade / req.ownedSession.
const requireOwnTradePicture = (paramName = 'id') => async (req, res, next) => {
  try {
    const picture = await TradePicture.findByPk(req.params[paramName]);
    if (!picture) throw notFound('Trade picture not found');

    const { trade, session } = await assertTradeOwnership(picture.tradeId, req.user.userId);
    req.ownedPicture = picture;
    req.ownedTrade = trade;
    req.ownedSession = session;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireOwnSession, requireOwnTrade, requireOwnTradePicture };
