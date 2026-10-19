'use strict';

const Sequelize = require('sequelize');
const config = require('../config/database')[process.env.NODE_ENV || 'development'];

const sequelize = new Sequelize(config.database, config.username, config.password, config);

const BrokerConnection = sequelize.define('BrokerConnection', {
  id: { type: Sequelize.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  accountId: { type: Sequelize.DataTypes.INTEGER, allowNull: false, unique: true },
  userId: { type: Sequelize.DataTypes.STRING(36), allowNull: false },
  platform: { type: Sequelize.DataTypes.ENUM('mt4', 'mt5'), allowNull: false },
  brokerLogin: { type: Sequelize.DataTypes.STRING(64), allowNull: false },
  brokerServer: { type: Sequelize.DataTypes.STRING(255), allowNull: false },
  encryptedPassword: { type: Sequelize.DataTypes.TEXT, allowNull: true },
  metaApiAccountId: { type: Sequelize.DataTypes.STRING, allowNull: true },
  syncedThrough: { type: Sequelize.DataTypes.DATE, allowNull: true },
  syncState: { type: Sequelize.DataTypes.STRING, allowNull: false, defaultValue: 'idle' },
  syncError: { type: Sequelize.DataTypes.STRING, allowNull: true },
  syncResult: { type: Sequelize.DataTypes.JSONB, allowNull: true },
  lastDealId: { type: Sequelize.DataTypes.STRING(64), allowNull: true },
  lastDealTime: { type: Sequelize.DataTypes.DATE, allowNull: true },
  status: {
    type: Sequelize.DataTypes.ENUM('pending', 'active', 'disabled'),
    allowNull: false,
    defaultValue: 'pending',
  },
}, { tableName: 'BrokerConnections', schema: 'broker_sync' });

const ImportedDeal = sequelize.define('ImportedDeal', {
  accountId: { type: Sequelize.DataTypes.INTEGER, primaryKey: true },
  externalDealId: { type: Sequelize.DataTypes.STRING(64), primaryKey: true },
}, { schema: 'broker_sync', tableName: 'ImportedDeals' });

module.exports = { BrokerConnection, ImportedDeal, sequelize, Sequelize };