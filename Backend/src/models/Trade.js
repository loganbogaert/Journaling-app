'use strict';

module.exports = (sequelize, DataTypes) => {
  const Trade = sequelize.define('Trade', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    pairId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    entry: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false,
    },
    tp: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false,
    },
    sl: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false,
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
      allowNull: false,
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
  });

  Trade.associate = (models) => {
    Trade.belongsTo(models.Session, { foreignKey: 'sessionId', as: 'session' });
    Trade.belongsTo(models.Pair, { foreignKey: 'pairId', as: 'pair' });
    Trade.hasMany(models.TradePicture, { foreignKey: 'tradeId', as: 'pictures', onDelete: 'CASCADE' });
  };

  return Trade;
};
