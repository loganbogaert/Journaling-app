'use strict';

const tradeApiClient = require('../services/tradeApiClient');

function compareDealIds(left, right) {
  if (/^\d+$/.test(left) && /^\d+$/.test(right)) {
    const a = BigInt(left);
    const b = BigInt(right);
    return a < b ? -1 : a > b ? 1 : 0;
  }
  return left.localeCompare(right);
}

exports.getCursor = (req, res) => {
  const connection = req.brokerConnection;
  return res.status(200).json({
    lastDealId: connection.lastDealId,
    lastDealTime: connection.lastDealTime ? Math.floor(connection.lastDealTime.getTime() / 1000) : null,
  });
};

exports.ingest = async (req, res, next) => {
  try {
    const connection = req.brokerConnection;
    const { cursorTime, ...deal } = req.body;
    const trade = await tradeApiClient.ingestTrade({
      accountId: connection.accountId,
      ...deal,
    });

    const incomingTime = new Date(cursorTime * 1000);
    const previousTime = connection.lastDealTime ? new Date(connection.lastDealTime) : null;
    const shouldAdvance = !previousTime
      || incomingTime > previousTime
      || (incomingTime.getTime() === previousTime.getTime()
        && compareDealIds(deal.externalDealId, connection.lastDealId || '') > 0);

    if (shouldAdvance) {
      await connection.update({
        lastDealId: deal.externalDealId,
        lastDealTime: incomingTime,
      });
    }

    return res.status(trade.created ? 201 : 200).json({
      accepted: true,
      duplicate: !trade.created,
      cursor: {
        lastDealId: connection.lastDealId,
        lastDealTime: connection.lastDealTime ? Math.floor(connection.lastDealTime.getTime() / 1000) : null,
      },
    });
  } catch (err) {
    next(err);
  }
};