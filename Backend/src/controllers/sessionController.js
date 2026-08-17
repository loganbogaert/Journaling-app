'use strict';

const { Session } = require('../models');

exports.create = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { name, accountBalance, currency, startDate, endDate } = req.body;

    const session = await Session.create({
      userId,
      name,
      accountBalance,
      currency,
      startDate: startDate || null,
      endDate: endDate || null,
    });

    return res.status(201).json(session);
  } catch (err) {
    next(err);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const sessions = await Session.findAll({ where: { userId } });
    return res.status(200).json(sessions);
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const session = await Session.findByPk(req.params.id);

    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (String(session.userId) !== String(userId)) return res.status(403).json({ message: 'Unauthorized' });

    return res.status(200).json(session);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const session = await Session.findByPk(req.params.id);

    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (String(session.userId) !== String(userId)) return res.status(403).json({ message: 'Unauthorized' });

    await session.update(req.body);
    return res.status(200).json(session);
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const session = await Session.findByPk(req.params.id);

    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (String(session.userId) !== String(userId)) return res.status(403).json({ message: 'Unauthorized' });

    await session.destroy();
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
};
