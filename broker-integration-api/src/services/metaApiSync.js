'use strict';

const credentials = require('./credentialEncryption');
const TIMEFRAMES = { M1: '1m', M5: '5m', M15: '15m', M30: '30m', H1: '1h', H4: '4h', D1: '1d' };

async function historyPages(read, field) {
  const rows = [];
  const limit = 1000;
  for (let offset = 0; ; offset += limit) {
    const page = await read(offset, limit);
    if (page.synchronizing) throw new Error('Broker history is still synchronizing; try again shortly');
    const items = page[field];
    if (!Array.isArray(items)) throw new Error('MetaApi returned an invalid history page');
    rows.push(...items);
    if (items.length < limit) return rows;
  }
}

function normalizeMt4(order) {
  return {
    externalDealId: String(order.id), symbol: order.symbol,
    entry: Number(order.openPrice), exit: Number(order.closePrice),
    entryDate: new Date(order.openTime), exitDate: new Date(order.doneTime),
    direction: order.type === 'ORDER_TYPE_BUY' ? 'long' : 'short',
    tp: Number(order.takeProfit) || null, sl: Number(order.stopLoss) || null,
    profit: Number(order.profit || 0), fee: -(Number(order.commission || 0) + Number(order.swap || 0)),
    volume: Number(order.volume),
  };
}

function normalizeMt5(close, position) {
  const opening = position.filter((deal) => deal.entryType === 'DEAL_ENTRY_IN'
    && new Date(deal.time) <= new Date(close.time));
  if (position.some((deal) => deal.entryType === 'DEAL_ENTRY_INOUT' && new Date(deal.time) <= new Date(close.time))) {
    throw new Error('A reversed/netting position requires manual review before import');
  }
  const volume = opening.reduce((sum, deal) => sum + Number(deal.volume), 0);
  if (!opening.length || volume <= 0) throw new Error('Opening history is unavailable for a closed position');
  const first = [...opening].sort((left, right) => new Date(left.time) - new Date(right.time))[0];
  const commission = opening.reduce((sum, deal) => sum + Number(deal.commission || 0), 0)
    * Number(close.volume) / volume + Number(close.commission || 0);
  return {
    externalDealId: String(close.id), symbol: close.symbol,
    entry: opening.reduce((sum, deal) => sum + Number(deal.volume) * Number(deal.price), 0) / volume,
    exit: Number(close.price), entryDate: new Date(first.time), exitDate: new Date(close.time),
    direction: first.type === 'DEAL_TYPE_BUY' ? 'long' : 'short',
    tp: Number(close.takeProfit) || null, sl: Number(close.stopLoss) || null,
    profit: Number(close.profit || 0), fee: -(commission + Number(close.swap || 0)),
    volume: Number(close.volume),
  };
}

async function runMetaApiSync(connection, { api, tradeClient, receipts, render }) {
  let account;
  let rpc;
  const result = { imported: 0, skipped: 0 };
  let cleanupFailed = false;
  try {
    if (!connection.encryptedPassword) throw new Error('Add an investor password to this connected account first');
    if (connection.metaApiAccountId) {
      account = await api.metatraderAccountApi.getAccount(connection.metaApiAccountId);
    } else {
      account = await api.metatraderAccountApi.createAccount({
        name: `Journal account ${connection.accountId}`,
        type: 'cloud-g2', platform: connection.platform,
        login: connection.brokerLogin, server: connection.brokerServer,
        password: credentials.decrypt(connection.encryptedPassword),
        magic: 0, application: 'MetaApi', reliability: 'regular',
        region: process.env.META_API_REGION || 'london',
      });
      await connection.update({ metaApiAccountId: account.id });
    }
    await account.deploy();
    await account.waitConnected(120);
    rpc = account.getRPCConnection();
    await rpc.connect();
    await rpc.waitSynchronized(120);
    const end = new Date();
    const start = connection.syncedThrough
      ? new Date(Math.max(0, new Date(connection.syncedThrough).getTime() - 24 * 3600_000)) : new Date(0);
    const settings = await tradeClient.getScreenshotSettings(connection.accountId);
    const isMt4 = connection.platform === 'mt4';
    const rows = await historyPages(
      (offset, limit) => isMt4
        ? rpc.getHistoryOrdersByTimeRange(start, end, offset, limit)
        : rpc.getDealsByTimeRange(start, end, offset, limit),
      isMt4 ? 'historyOrders' : 'deals',
    );
    const closed = rows.filter((row) => isMt4
      ? ['ORDER_TYPE_BUY', 'ORDER_TYPE_SELL'].includes(row.type) && row.state === 'ORDER_STATE_FILLED' && row.doneTime
      : ['DEAL_ENTRY_OUT', 'DEAL_ENTRY_OUT_BY', 'DEAL_ENTRY_INOUT'].includes(row.entryType)
        && ['DEAL_TYPE_BUY', 'DEAL_TYPE_SELL'].includes(row.type));
    closed.sort((left, right) => new Date(left.doneTime || left.time) - new Date(right.doneTime || right.time));
    for (const row of closed) {
      const where = { accountId: connection.accountId, externalDealId: String(row.id) };
      if (await receipts.findOne({ where })) { result.skipped++; continue; }
      const position = isMt4 ? [] : (await rpc.getDealsByPosition(row.positionId)).deals;
      const trade = isMt4 ? normalizeMt4(row) : normalizeMt5(row, position);
      trade.risk = null;
      if (trade.sl) {
        const specification = await rpc.getSymbolSpecification(trade.symbol);
        const price = await rpc.getSymbolPrice(trade.symbol);
        if (specification.tickSize > 0 && price.lossTickValue > 0) {
          trade.risk = Math.abs(trade.entry - trade.sl) / specification.tickSize * price.lossTickValue * trade.volume;
        }
      }
      delete trade.volume;
      const net = trade.profit - trade.fee;
      trade.result = Math.abs(net) < 0.005 ? 'BE' : net > 0 ? 'W' : 'L';
      const stored = await tradeClient.ingestTrade({ accountId: connection.accountId, ...trade });
      for (const timeframe of settings.timeframes) {
        const candles = await account.getHistoricalCandles(trade.symbol, TIMEFRAMES[timeframe], trade.exitDate, settings.candleCount);
        if (!candles.length) throw new Error('Historical candles unavailable; sync can be retried');
        const png = render({ ...trade, timeframe, candles: candles.map((candle) => ({
          ...candle, time: Math.floor(new Date(candle.time).getTime() / 1000), volume: candle.tickVolume || 0,
        })) });
        await tradeClient.storeScreenshot(stored.trade.id, {
          externalDealId: trade.externalDealId, timeframe, imageBase64: png.toString('base64'),
        });
      }
      await receipts.findOrCreate({ where, defaults: where });
      result.imported++;
    }
    await connection.update({ syncedThrough: end, syncResult: result });
    return result;
  } finally {
    try { if (rpc) await rpc.close(); } catch { cleanupFailed = true; }
    try {
      if (account) {
        await account.undeploy();
        await account.waitUndeployed(120);
      }
    } catch { cleanupFailed = true; }
    if (cleanupFailed) throw new Error('MetaApi cleanup failed. Check the account in MetaApi and undeploy it to avoid hosting charges');
  }
}

module.exports = { historyPages, normalizeMt4, normalizeMt5, runMetaApiSync };