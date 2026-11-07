'use strict';

const { BrokerConnection, ImportedDeal, sequelize } = require('../models');
const credentials = require('../services/credentialEncryption');

async function withAccountLock(accountId, operation) {
  return sequelize.transaction(async (transaction) => {
    const [rows] = await sequelize.query(
      'SELECT pg_try_advisory_xact_lock(20261019, :accountId) AS acquired',
      {
        replacements: { accountId: Number(accountId) },
        transaction,
      },
    );
    if (!rows[0].acquired) {
      const error = new Error('A sync is running for this account; wait until it finishes');
      error.status = 409;
      throw error;
    }
    return operation(transaction);
  });
}

exports.provision = async (req, res, next) => {
  try {
    const { investorPassword, ...metadata } = req.body;
    const values = {
      ...metadata,
      encryptedPassword: credentials.encrypt(investorPassword),
      status: 'active',
    };
    const { connection, created } = await withAccountLock(
      req.body.accountId,
      async (transaction) => {
        const [connection, created] = await BrokerConnection.findOrCreate({
          where: { accountId: req.body.accountId },
          defaults: values,
          transaction,
        });
        if (!created) {
          if (
            connection.platform !== metadata.platform ||
            connection.brokerLogin !== metadata.brokerLogin ||
            connection.brokerServer !== metadata.brokerServer
          ) {
            const error = new Error('Broker identity cannot be changed on an existing account');
            error.status = 409;
            throw error;
          }
          if (connection.metaApiAccountId) {
            if (!process.env.META_API_ACCESS_TOKEN)
              throw new Error('MetaApi token is required to update broker credentials');
            const MetaApi = require('metaapi.cloud-sdk').default;
            const api = new MetaApi(process.env.META_API_ACCESS_TOKEN);
            const remote = await api.metatraderAccountApi.getAccount(connection.metaApiAccountId);
            await remote.update({ password: investorPassword });
          }
          await connection.update(values, { transaction });
        }
        return { connection, created };
      },
    );

    return res.status(created ? 201 : 200).json({
      accountId: connection.accountId,
      status: connection.status,
    });
  } catch (err) {
    next(err);
  }
};

exports.revoke = async (req, res, next) => {
  try {
    await withAccountLock(req.params.accountId, async (transaction) => {
      const connection = await BrokerConnection.findOne({
        where: { accountId: req.params.accountId },
        transaction,
      });
      if (!connection) return;
      if (connection.metaApiAccountId) {
        if (!process.env.META_API_ACCESS_TOKEN)
          throw new Error('MetaApi token is required to remove the remote connection');
        const MetaApi = require('metaapi.cloud-sdk').default;
        const api = new MetaApi(process.env.META_API_ACCESS_TOKEN);
        const remote = await api.metatraderAccountApi.getAccount(connection.metaApiAccountId);
        await remote.remove();
      }
      await ImportedDeal.destroy({ where: { accountId: connection.accountId }, transaction });
      await connection.destroy({ transaction });
    });
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
};
