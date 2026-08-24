'use strict';

const { Trade } = require('../models');

// A loss forfeits the full risked amount; break-even keeps principal intact; wins use the entered profit
function computeGrossProfit(result, risk, profit) {
  if (result === 'L') return -Math.abs(Number(risk) || 0);
  if (result === 'BE') return 0;
  return profit ?? 0;
}

exports.create = async (req, res, next) => {
  try {
    const { sessionId, pairId, entry, tp, sl, entryDate, exitDate, direction, risk, fee, profit, result, notes } = req.body;

    const safeProfit = computeGrossProfit(result, risk, profit);

    const trade = await Trade.create({
      sessionId,
      pairId,
      entry,
      tp,
      sl,
      entryDate,
      exitDate,
      direction,
      risk,
      fee: (fee === null || fee === '') ? 0 : fee,
      profit: safeProfit,
      result,
      notes: notes || null,
    });

    return res.status(201).json(trade);
  } catch (err) {
    next(err);
  }
};

exports.getBySession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = req.ownedSession;

    // Get all trades in chronological order
    const trades = await Trade.findAll({
      where: {
        sessionId,
      },
      order: [['exitDate', 'ASC']],
    });

    // ==========================================
    // METRICS
    // ==========================================

    const totalTrades = trades.length;

    const winningTrades = trades.filter(
      (trade) => trade.result === 'W'
    ).length;

    const losingTrades = trades.filter(
      (trade) => trade.result === 'L'
    ).length;

    const breakevenTrades = trades.filter(
      (trade) => trade.result === 'BE'
    ).length;

    // Winrate is based on all trades, including BE trades
    const winrate =
      totalTrades > 0
        ? (winningTrades / totalTrades) * 100
        : 0;

    // ==========================================
    // AVERAGE RISK / REWARD
    // ==========================================

    let totalRiskReward = 0;
    let riskRewardCount = 0;

    // ==========================================
    // BALANCE HISTORY
    // ==========================================

    const startingBalance = Number(session.accountBalance);
    let balance = startingBalance;

    // Leading baseline point so the chart always starts from the account's starting balance
    const balanceHistory = [
      {
        tradeId: null,
        date: session.startDate ?? null,
        balance: Number(balance.toFixed(2)),
        profit: 0,
        percent: 0,
        changePercent: 0,
        result: null,
      },
    ];

    for (const trade of trades) {
      const grossProfit = Number(trade.profit) || 0;
      const fee = Number(trade.fee) || 0;
      const risk = Number(trade.risk) || 0;

      // Actual profit after fees
      const netProfit = grossProfit - fee;

      // RR including fees
      //
      // Example:
      // profit = 100
      // fee = 5
      // risk = 50
      //
      // RR = (100 - 5) / 50 = 1.9R
      if (risk > 0) {
        const riskReward = netProfit / risk;

        totalRiskReward += riskReward;
        riskRewardCount++;
      }

      // Add the net result of the trade to the account balance
      balance += netProfit;

      // % impact of this trade alone, relative to the starting balance (not the compounding
      // balance right before it) so it matches how risk-per-trade is usually expressed
      const changePercent = startingBalance !== 0 ? (netProfit / startingBalance) * 100 : 0;

      // Cumulative % change since the start of the session
      const percent = startingBalance !== 0 ? ((balance - startingBalance) / startingBalance) * 100 : 0;

      balanceHistory.push({
        tradeId: trade.id,
        date: trade.exitDate,
        balance: Number(balance.toFixed(2)),
        profit: Number(netProfit.toFixed(2)),
        percent: Number(percent.toFixed(2)),
        changePercent: Number(changePercent.toFixed(2)),
        result: trade.result,
      });
    }

    const averageRiskReward =
      riskRewardCount > 0
        ? totalRiskReward / riskRewardCount
        : 0;

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      trades,

      metrics: {
        totalTrades,
        winningTrades,
        losingTrades,
        breakevenTrades,
        winrate: Number(winrate.toFixed(2)),
        averageRiskReward: Number(averageRiskReward.toFixed(2)),
      },

      startingBalance: Number(startingBalance.toFixed(2)),
      balanceHistory,
    });
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    return res.status(200).json(req.ownedTrade);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const trade = req.ownedTrade;

    // A trade can't be moved to another session through this endpoint
    const { sessionId, id, createdAt, updatedAt, ...updatableFields } = req.body;

    const result = updatableFields.result ?? trade.result;
    const risk = updatableFields.risk ?? trade.risk;
    const safeProfit = computeGrossProfit(result, risk, updatableFields.profit);

    await trade.update({ ...updatableFields, profit: safeProfit });
    return res.status(200).json(trade);
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    await req.ownedTrade.destroy();
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
};
