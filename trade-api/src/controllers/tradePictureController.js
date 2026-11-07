'use strict';

const { TradePicture } = require('../models');

exports.add = async (req, res, next) => {
  try {
    const { tradeId } = req.params;
    const { pictureUrl } = req.body;

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
    const { tradeId } = req.params;
    const pictures = await TradePicture.findAll({ where: { tradeId } });
    return res.status(200).json(pictures);
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    await req.ownedPicture.destroy();
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
};
