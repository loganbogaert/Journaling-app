'use strict';

module.exports = (sequelize, DataTypes) => {
  const Account = sequelize.define('Account', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      // Keycloak subject (`sub` claim) — no longer a local FK, Keycloak owns identity now
      type: DataTypes.STRING(36),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('manual', 'connected'),
      allowNull: false,
      defaultValue: 'manual',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    accountBalance: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.CHAR(3),
      allowNull: false,
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    platform: {
      type: DataTypes.ENUM('mt4', 'mt5'),
      allowNull: true,
    },
    brokerServer: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    brokerLogin: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    syncStatus: {
      type: DataTypes.ENUM('pending', 'active', 'error', 'disabled'),
      allowNull: true,
    },
    lastSyncedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  });

  Account.associate = (models) => {
    Account.hasMany(models.Trade, { foreignKey: 'accountId', as: 'trades', onDelete: 'CASCADE' });
  };

  return Account;
};
