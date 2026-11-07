'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('ScreenshotSettings', {
  userId: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    allowNull: false,
  },
  timeframes: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: ['M5', 'H4', 'D1'],
  },
  candleCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 300,
  },
});