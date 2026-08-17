'use strict';

const { TradePicture, Trade, Session } = require('../models');

exports.add = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { tradeId } = req.params;
    const { pictureUrl } = req.body;

    const trade = await Trade.findByPk(tradeId);
    if (!trade) return res.status(404).json({ message: 'Trade not found' });

    const session = await Session.findByPk(trade.sessionId);
    if (!session || String(session.userId) !== String(userId)) return res.status(403).json({ message: 'Unauthorized' });

    const picture = await TradePicture.create({ tradeId, pictureUrl });
    return res.status(201).json(picture);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'Picture URL already exists' });
    }
    next(err);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { tradeId } = req.params;

    const trade = await Trade.findByPk(tradeId);
    if (!trade) return res.status(404).json({ message: 'Trade not found' });

    const session = await Session.findByPk(trade.sessionId);
    if (!session || String(session.userId) !== String(userId)) return res.status(403).json({ message: 'Unauthorized' });

    const pictures = await TradePicture.findAll({ where: { tradeId } });
    return res.status(200).json(pictures);
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const picture = await TradePicture.findByPk(req.params.id);
    if (!picture) return res.status(404).json({ message: 'Trade picture not found' });

    const trade = await Trade.findByPk(picture.tradeId);
    if (!trade) return res.status(404).json({ message: 'Trade not found' });

    const session = await Session.findByPk(trade.sessionId);
    if (!session || String(session.userId) !== String(userId)) return res.status(403).json({ message: 'Unauthorized' });

    await picture.destroy();
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
};
