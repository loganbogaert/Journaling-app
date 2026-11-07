'use strict';

module.exports = (sequelize, DataTypes) => {
  const Trade = sequelize.define('Trade', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    accountId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    source: {
      type: DataTypes.ENUM('manual', 'sync'),
      allowNull: false,
      defaultValue: 'manual',
    },
    externalDealId: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    pairId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    entry: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false,
    },
    exit: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: true,
    },
    tp: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: true,
    },
    sl: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: true,
    },
    entryDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    exitDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    direction: {
      type: DataTypes.ENUM('long', 'short'),
      allowNull: false,
    },
    risk: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    profit: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    result: {
      type: DataTypes.ENUM('W', 'BE', 'L'),
      allowNull: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    validate: {
      manualRequiresTpSlRisk() {
        if (this.source !== 'manual') return;
        const missing = ['tp', 'sl', 'risk'].filter((field) => this[field] === null || this[field] === undefined);
        if (missing.length) throw new Error(`Manual trades require: ${missing.join(', ')}`);
      },
      syncRequiresExternalDealId() {
        if (this.source === 'sync' && !this.externalDealId) throw new Error('Synced trades require externalDealId');
      },
    },
  });

  Trade.associate = (models) => {
    Trade.belongsTo(models.Account, { foreignKey: 'accountId', as: 'account' });
    Trade.belongsTo(models.Pair, { foreignKey: 'pairId', as: 'pair' });
    Trade.hasMany(models.TradePicture, { foreignKey: 'tradeId', as: 'pictures', onDelete: 'CASCADE' });
  };

  return Trade;
};
