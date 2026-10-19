'use strict';

const crypto = require('crypto');
const { BrokerConnection } = require('../models');

module.exports = async (req, res, next) => {
  try {
    const apiKey = req.get('X-Account-Key');
    if (!apiKey || !apiKey.startsWith('ea_')) {
      return res.status(401).json({ message: 'Missing or invalid account key' });
    }

    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const connection = await BrokerConnection.findOne({ where: { apiKeyHash, status: 'active' } });
    if (!connection) return res.status(401).json({ message: 'Invalid or revoked account key' });

    req.brokerConnection = connection;
    next();
  } catch (err) {
    next(err);
  }
};