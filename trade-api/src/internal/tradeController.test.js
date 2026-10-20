'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Account, Pair, Trade, sequelize } = require('../models');
const controller = require('./tradeController');

function response() {
  return {
    statusCode: 200,
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
  };
}

test('internal import resolves unknown symbols and reuses the local pair ID', async (context) => {
  const pairs = new Map();
  context.mock.method(Account, 'findByPk', async () => ({ type: 'connected', currency: 'USD' }));
  context.mock.method(Pair, 'findOrCreate', async ({ where }) => {
    const existing = pairs.has(where.pair);
    if (!existing) pairs.set(where.pair, { id: 42, pair: where.pair });
    return [pairs.get(where.pair), !existing];
  });
  const writes = [];
  context.mock.method(Trade, 'findOrCreate', async (options) => {
    writes.push(options);
    return [{ id: writes.length, ...options.defaults }, true];
  });
  for (const externalDealId of ['1', '2']) {
    const res = response();
    await controller.ingest({ body: {
      accountId: 7, currency: 'USD', symbol: 'EURUSD.raw', externalDealId,
      profit: 100, fee: 5, risk: 50,
    } }, res, (error) => { throw error; });
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.trade.pairId, 42);
    assert.equal(res.body.trade.source, 'sync');
  }
  assert.equal(pairs.size, 1);
  assert.equal(writes[0].defaults.currency, undefined);
  assert.equal(writes[0].defaults.symbol, undefined);
});

test('currency mismatch is rejected before creating a pair or trade', async (context) => {
  context.mock.method(Account, 'findByPk', async () => ({ type: 'connected', currency: 'EUR' }));
  const pairLookup = context.mock.method(Pair, 'findOrCreate', async () => { throw new Error('Unexpected pair lookup'); });
  const tradeWrite = context.mock.method(Trade, 'findOrCreate', async () => { throw new Error('Unexpected trade write'); });
  const res = response();
  await controller.ingest({ body: { accountId: 7, currency: 'USD', symbol: 'EURUSD' } }, res,
    (error) => { throw error; });
  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /USD.*EUR/);
  assert.equal(pairLookup.mock.callCount(), 0);
  assert.equal(tradeWrite.mock.callCount(), 0);
});

test.after(async () => sequelize.close());