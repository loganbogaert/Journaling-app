'use strict';

const crypto = require('crypto');
const { Trade, TradePicture } = require('../models');
const imageController = require('../controllers/imageController');

exports.store = async (req, res, next) => {
  try {
    const trade = await Trade.findByPk(req.params.tradeId);
    if (!trade || trade.source !== 'sync') {
      return res.status(404).json({ message: 'Synced trade not found' });
    }

    const imageBuffer = Buffer.from(req.body.imageBase64, 'base64');
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (imageBuffer.length < pngSignature.length || !imageBuffer.subarray(0, 8).equals(pngSignature)) {
      return res.status(400).json({ message: 'Screenshot must be a valid PNG image' });
    }

    const dealKey = crypto.createHash('sha256').update(req.body.externalDealId).digest('hex').slice(0, 16);
    const objectName = `${trade.id}/auto-${dealKey}-${req.body.timeframe}.png`;
    await imageController.storeGeneratedPng(objectName, imageBuffer);

    const [picture] = await TradePicture.findOrCreate({
      where: { pictureUrl: objectName },
      defaults: { tradeId: trade.id, pictureUrl: objectName },
    });
    return res.status(201).json({ id: picture.id, tradeId: picture.tradeId, objectName });
  } catch (err) {
    next(err);
  }
};