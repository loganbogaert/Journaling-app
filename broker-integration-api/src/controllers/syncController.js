'use strict';

const { BrokerConnection, ImportedDeal, sequelize } = require('../models');
const { runMetaApiSync } = require('../services/metaApiSync');
const tradeClient = require('../services/tradeApiClient');
const { renderCandlestickChart } = require('../services/chartRenderer');

function status(connection) {
  return {
    state: connection.syncState,
    error: connection.syncError,
    result: connection.syncResult,
    lastSyncedAt: connection.syncedThrough,
    credentialsRequired: !connection.encryptedPassword,
  };
}

exports.status = async (req, res, next) => {
  try {
    const connection = await BrokerConnection.findOne({
      where: { accountId: req.params.accountId },
    });
    if (!connection) return res.status(404).json({ message: 'Broker connection not found' });

    if (connection.syncState === 'syncing') {
      await sequelize.transaction(async (transaction) => {
        const [rows] = await sequelize.query(
          'SELECT pg_try_advisory_xact_lock(20261019, :accountId) AS acquired',
          {
            replacements: { accountId: connection.accountId },
            transaction,
          },
        );
        if (rows[0].acquired) {
          await connection.update(
            {
              syncState: 'failed',
              syncError:
                'The previous sync was interrupted. Check MetaApi deployment status to avoid hosting charges, then retry.',
            },
            { transaction },
          );
        }
      });
    }

    return res.json(status(connection));
  } catch (err) {
    next(err);
  }
};

exports.start = async (req, res, next) => {
  let lock;

  try {
    const connection = await BrokerConnection.findOne({
      where: { accountId: req.params.accountId },
    });
    if (!connection) return res.status(404).json({ message: 'Broker connection not found' });
    if (!connection.encryptedPassword)
      return res
        .status(409)
        .json({ message: 'Edit this account and add its investor password first' });
    if (
      !process.env.META_API_ACCESS_TOKEN ||
      process.env.META_API_ACCESS_TOKEN.startsWith('replace-with-')
    ) {
      return res
        .status(503)
        .json({ message: 'META_API_ACCESS_TOKEN is not configured on the server' });
    }

    lock = await sequelize.connectionManager.getConnection();
    const acquired = await lock.query('SELECT pg_try_advisory_lock(20261019, $1) AS acquired', [
      connection.accountId,
    ]);

    if (!acquired.rows[0].acquired) {
      await sequelize.connectionManager.releaseConnection(lock);
      lock = null;
      return res.status(409).json({ message: 'A sync is already running for this account' });
    }

    const MetaApi = require('metaapi.cloud-sdk').default;
    const api = new MetaApi(process.env.META_API_ACCESS_TOKEN);

    await connection.update({ syncState: 'syncing', syncError: null, syncResult: null });

    const heldLock = lock;
    lock = null;

    runMetaApiSync(connection, {
      api,
      tradeClient,
      receipts: ImportedDeal,
      render: renderCandlestickChart,
    })
      .then(() => connection.update({ syncState: 'succeeded', syncError: null }))
      .catch(async (err) => {
        const message =
          err.status === 409 || err.message.startsWith('MetaApi cleanup failed')
            ? err.message
            : 'Sync failed. Verify broker credentials, MetaApi access and historical-data permissions, then retry.';
        await connection.update({ syncState: 'failed', syncError: message });
      })
      .finally(async () => {
        try {
          await heldLock.query('SELECT pg_advisory_unlock(20261019, $1)', [connection.accountId]);
        } finally {
          await sequelize.connectionManager.releaseConnection(heldLock);
        }
      })
      .catch(() => console.error('Could not persist broker sync outcome or release its lock'));

    return res.status(202).json(status(connection));
  } catch (err) {
    if (lock) {
      await lock
        .query('SELECT pg_advisory_unlock(20261019, $1)', [Number(req.params.accountId)])
        .catch(() => {});
      await sequelize.connectionManager.releaseConnection(lock);
    }

    next(err);
  }
};
