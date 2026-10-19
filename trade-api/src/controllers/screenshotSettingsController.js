'use strict';

const { Account, ScreenshotSettings } = require('../models');

const DEFAULTS = { timeframes: ['M5', 'H4', 'D1'], candleCount: 300 };

async function settingsForUser(userId) {
  const [settings] = await ScreenshotSettings.findOrCreate({
    where: { userId },
    defaults: { userId, ...DEFAULTS },
  });
  return settings;
}

exports.getMine = async (req, res, next) => {
  try {
    const settings = await settingsForUser(req.user.userId);
    return res.status(200).json(settings);
  } catch (err) {
    next(err);
  }
};

exports.updateMine = async (req, res, next) => {
  try {
    const settings = await settingsForUser(req.user.userId);
    await settings.update(req.body);
    return res.status(200).json(settings);
  } catch (err) {
    next(err);
  }
};

exports.getForAccount = async (req, res, next) => {
  try {
    const account = await Account.findByPk(req.params.accountId);
    if (!account || account.type !== 'connected') {
      return res.status(404).json({ message: 'Connected account not found' });
    }
    const settings = await settingsForUser(account.userId);
    return res.status(200).json({ timeframes: settings.timeframes, candleCount: settings.candleCount });
  } catch (err) {
    next(err);
  }
};