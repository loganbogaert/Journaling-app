'use strict';

module.exports = (sequelize, DataTypes) => {
  const TradePicture = sequelize.define('TradePicture', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    tradeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    pictureUrl: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  });

  TradePicture.associate = (models) => {
    TradePicture.belongsTo(models.Trade, { foreignKey: 'tradeId', as: 'trade' });
  };

  return TradePicture;
};
