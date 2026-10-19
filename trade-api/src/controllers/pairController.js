'use strict';

const { Pair } = require('../models');

exports.create = async (req, res, next) => {
  try {
    const { pair } = req.body;

    const existing = await Pair.findOne({ where: { pair } });
    if (existing) return res.status(409).json({ message: 'Pair already exists' });

    const newPair = await Pair.create({ pair });
    return res.status(201).json(newPair);
  } catch (err) {
    next(err);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const pairs = await Pair.findAll();
    return res.status(200).json(pairs);
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const pair = await Pair.findByPk(req.params.id);
    if (!pair) return res.status(404).json({ message: 'Pair not found' });

    await pair.destroy();
    return res.status(204).send();
  } catch (err) {
    if (err.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(409).json({ message: 'Cannot delete pair: it is referenced by existing trades' });
    }
    next(err);
  }
};
