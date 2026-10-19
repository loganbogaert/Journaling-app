'use strict';

module.exports = (sequelize, DataTypes) => {
  const Pair = sequelize.define('Pair', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    pair: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  }, { timestamps: false });

  Pair.associate = (models) => {
    Pair.hasMany(models.Trade, { foreignKey: 'pairId', as: 'trades' });
  };

  return Pair;
};
