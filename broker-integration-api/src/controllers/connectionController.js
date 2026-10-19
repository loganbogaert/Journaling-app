'use strict';

const crypto = require('crypto');
const { BrokerConnection } = require('../models');

function createAccountKey() {
  return `ea_${crypto.randomBytes(32).toString('base64url')}`;
}

exports.provision = async (req, res, next) => {
  try {
    const apiKey = createAccountKey();
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const values = { ...req.body, apiKeyHash, status: 'active' };
    const [connection, created] = await BrokerConnection.findOrCreate({
      where: { accountId: req.body.accountId },
      defaults: values,
    });

    if (!created) await connection.update(values);

    return res.status(created ? 201 : 200).json({
      accountId: connection.accountId,
      apiKey,
      status: connection.status,
    });
  } catch (err) {
    next(err);
  }
};

exports.revoke = async (req, res, next) => {
  try {
    const connection = await BrokerConnection.findOne({ where: { accountId: req.params.accountId } });
    if (!connection) return res.status(204).send();
    await connection.destroy();
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
};