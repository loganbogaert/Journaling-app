'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { historyPages, normalizeMt4, normalizeMt5, runMetaApiSync } = require('./metaApiSync');
const credentials = require('./credentialEncryption');

process.env.CREDENTIALS_ENCRYPTION_KEY = 'ab'.repeat(32);

function fixture({ platform = 'mt5', failCandles = false, failUndeploy = false, existing = false, failConnect = false } = {}) {
  const events = [];
  const imported = new Set();
  const entry = { id: '1', type: 'DEAL_TYPE_BUY', entryType: 'DEAL_ENTRY_IN', time: new Date('2026-10-01T10:00:00Z'), volume: 2, price: 100, commission: -4 };
  const close = { id: '2', type: 'DEAL_TYPE_SELL', entryType: 'DEAL_ENTRY_OUT', positionId: 'p1', time: new Date('2026-10-01T11:00:00Z'), volume: 1, price: 110, symbol: 'TEST', profit: 10, commission: -1, swap: 1, stopLoss: 95, takeProfit: 115 };
  const order = { id: '2', type: 'ORDER_TYPE_SELL', state: 'ORDER_STATE_FILLED', openTime: entry.time, doneTime: close.time, volume: 1, openPrice: 110, closePrice: 100, symbol: 'TEST', profit: 10, commission: -2, swap: 1 };
  const rpc = {
    async connect() { events.push('connect'); if (failConnect) throw new Error('connect failed'); },
    async waitSynchronized() { events.push('synchronized'); },
    async close() { events.push('closed'); },
    async getDealsByTimeRange() { return { deals: [close] }; },
    async getHistoryOrdersByTimeRange() { return { historyOrders: [order] }; },
    async getDealsByPosition() { return { deals: [entry, close] }; },
    async getSymbolSpecification() { return { tickSize: 1 }; },
    async getSymbolPrice() { return { lossTickValue: 1 }; },
  };
  const account = {
    id: 'remote-id',
    async deploy() { events.push('deploy'); },
    async waitConnected() {},
    getRPCConnection() { return rpc; },
    async undeploy() { events.push('undeploy'); if (failUndeploy) throw new Error('provider failure'); },
    async waitUndeployed() { events.push('undeployed'); },
    async getHistoricalCandles(symbol, timeframe, end, limit) {
      events.push(['candles', symbol, timeframe, limit]);
      assert.equal(end.toISOString(), close.time.toISOString());
      if (failCandles) throw new Error('candles denied');
      return [{ time: entry.time, open: 100, high: 110, low: 95, close: 105, tickVolume: 50 }];
    },
  };
  const connection = {
    accountId: 99, platform, brokerLogin: '123', brokerServer: 'test',
    encryptedPassword: credentials.encrypt('investor-test'),
    metaApiAccountId: existing ? 'remote-id' : null,
    async update(fields) { events.push(['update', fields]); Object.assign(this, fields); },
  };
  const dependencies = {
    api: { metatraderAccountApi: {
      async createAccount(options) { events.push('created'); assert.equal(options.password, 'investor-test'); return account; },
      async getAccount(id) { events.push('loaded'); assert.equal(id, 'remote-id'); return account; },
    } },
    receipts: {
      async findOne({ where }) { return imported.has(where.externalDealId); },
      async findOrCreate({ where }) { imported.add(where.externalDealId); },
    },
    tradeClient: {
      async getScreenshotSettings() { return { timeframes: ['M5', 'H4', 'D1'], candleCount: 300 }; },
      async ingestTrade(trade) { events.push(['trade', trade]); return { trade: { id: 8 }, created: true }; },
      async storeScreenshot(id, screenshot) { assert.equal(id, 8); events.push(['picture', screenshot.timeframe]); },
    },
    render(data) { assert.equal(data.candles[0].volume, 50); return Buffer.from('mock-png'); },
  };
  return { connection, dependencies, events, imported };
}

test('paginated history requests every page and rejects incomplete synchronization', async () => {
  const offsets = [];
  const result = await historyPages(async (offset) => {
    offsets.push(offset);
    return { deals: offset === 0 ? Array.from({ length: 1000 }, (_, index) => index) : [1000] };
  }, 'deals');
  assert.equal(result.length, 1001);
  assert.deepEqual(offsets, [0, 1000]);
  await assert.rejects(historyPages(async () => ({ synchronizing: true, deals: [] }), 'deals'));
});

test('MT5 uses entry direction and allocates opening commission to partial close', () => {
  const entry = { type: 'DEAL_TYPE_BUY', entryType: 'DEAL_ENTRY_IN', price: 100, volume: 2, commission: -4, time: '2026-10-01T10:00:00Z' };
  const close = { id: '2', price: 110, volume: 1, commission: -1, swap: 1, profit: 10, time: '2026-10-01T11:00:00Z', symbol: 'TEST' };
  const trade = normalizeMt5(close, [entry]);
  assert.equal(trade.direction, 'long');
  assert.equal(trade.fee, 2);
  assert.equal(trade.entry, 100);
  assert.throws(() => normalizeMt5(close, []), /Opening history/);
});

test('MT4 maps closed order with negative fee for a swap credit', () => {
  const trade = normalizeMt4({ id: '5', type: 'ORDER_TYPE_SELL', openPrice: 100, closePrice: 90, commission: -1, swap: 3 });
  assert.equal(trade.direction, 'short');
  assert.equal(trade.fee, -2);
});

test('first sync registers lazily, stores trades/charts then checkpoints and undeploys', async () => {
  const { connection, dependencies, events, imported } = fixture();
  const result = await runMetaApiSync(connection, dependencies);
  assert.equal(result.imported, 1);
  assert.equal(connection.metaApiAccountId, 'remote-id');
  assert.ok(connection.syncedThrough instanceof Date);
  assert.deepEqual(events.filter((event) => Array.isArray(event) && event[0] === 'candles').map((event) => event[2]), ['5m', '4h', '1d']);
  assert.equal(events.filter((event) => Array.isArray(event) && event[0] === 'picture').length, 3);
  const trade = events.find((event) => Array.isArray(event) && event[0] === 'trade')[1];
  assert.equal(trade.risk, 5);
  assert.equal(trade.volume, undefined);
  assert.ok(imported.has('2'));
  assert.deepEqual(events.slice(-3), ['closed', 'undeploy', 'undeployed']);
  events.length = 0;
  const repeat = await runMetaApiSync(connection, dependencies);
  assert.equal(repeat.skipped, 1);
  assert.ok(events.includes('loaded'));
  assert.ok(!events.includes('created'));
  assert.ok(!events.some((event) => Array.isArray(event) && event[0] === 'candles'));
});

test('MT4 imports through closed-order history', async () => {
  const { connection, dependencies } = fixture({ platform: 'mt4' });
  assert.equal((await runMetaApiSync(connection, dependencies)).imported, 1);
});

test('failed screenshots do not advance checkpoint or completed receipt; cleanup still runs', async () => {
  const { connection, dependencies, events, imported } = fixture({ failCandles: true });
  await assert.rejects(runMetaApiSync(connection, dependencies), /candles denied/);
  assert.equal(connection.syncedThrough, undefined);
  assert.equal(imported.size, 0);
  assert.deepEqual(events.slice(-3), ['closed', 'undeploy', 'undeployed']);
});

test('failed connection still closes and undeploys', async () => {
  const { connection, dependencies, events } = fixture({ failConnect: true });
  await assert.rejects(runMetaApiSync(connection, dependencies), /connect failed/);
  assert.deepEqual(events.slice(-3), ['closed', 'undeploy', 'undeployed']);
});

test('undeploy failures explicitly warn about hosting charges', async () => {
  const { connection, dependencies } = fixture({ failUndeploy: true });
  await assert.rejects(runMetaApiSync(connection, dependencies), /cleanup failed.*hosting charges/);
});

test('credential encryption rejects tampered ciphertext', () => {
  const encrypted = credentials.encrypt('secret');
  assert.equal(credentials.decrypt(encrypted), 'secret');
  const parts = encrypted.split('.');
  parts[1] = Buffer.alloc(16).toString('base64');
  assert.throws(() => credentials.decrypt(parts.join('.')));
});