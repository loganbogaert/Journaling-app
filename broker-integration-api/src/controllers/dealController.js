'use strict';

const tradeApiClient = require('../services/tradeApiClient');
const { renderCandlestickChart } = require('../services/chartRenderer');

function compareDealIds(left, right) {
  if (/^\d+$/.test(left) && /^\d+$/.test(right)) {
    const a = BigInt(left);
    const b = BigInt(right);
    return a < b ? -1 : a > b ? 1 : 0;
  }
  return left.localeCompare(right);
}

exports.getCursor = async (req, res, next) => {
  try {
    const connection = req.brokerConnection;
    const settings = await tradeApiClient.getScreenshotSettings(connection.accountId);
    return res.status(200).json({
      lastDealId: connection.lastDealId,
      lastDealTime: connection.lastDealTime
        ? Math.floor(connection.lastDealTime.getTime() / 1000)
        : null,
      timeframes: settings.timeframes,
      candleCount: settings.candleCount,
    });
  } catch (err) {
    next(err);
  }
};

exports.ingest = async (req, res, next) => {
  try {
    const connection = req.brokerConnection;
    const { cursorTime, ...deal } = req.body;
    const trade = await tradeApiClient.ingestTrade({
      accountId: connection.accountId,
      ...deal,
    });

    const settings = await tradeApiClient.getScreenshotSettings(connection.accountId);
    for (const timeframe of settings.timeframes) {
      const candles = deal.candles?.[timeframe];
      if (!candles?.length) throw new Error(`Missing candle payload for ${timeframe}`);

      const png = await renderCandlestickChart({
        symbol: deal.symbol,
        timeframe,
        candles,
        entry: deal.entry,
        exit: deal.exit,
      });
      await tradeApiClient.storeScreenshot(trade.trade.id, {
        externalDealId: deal.externalDealId,
        timeframe,
        imageBase64: png.toString('base64'),
      });
    }

    const incomingTime = new Date(cursorTime * 1000);
    const previousTime = connection.lastDealTime ? new Date(connection.lastDealTime) : null;
    const shouldAdvance =
      !previousTime ||
      incomingTime > previousTime ||
      (incomingTime.getTime() === previousTime.getTime() &&
        compareDealIds(deal.externalDealId, connection.lastDealId || '') > 0);

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
        lastDealTime: connection.lastDealTime
          ? Math.floor(connection.lastDealTime.getTime() / 1000)
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
};
