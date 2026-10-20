'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ScreenshotSettings', {
      userId: { type: Sequelize.STRING(36), primaryKey: true, allowNull: false },
      timeframes: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: ['M5', 'H4', 'D1'],
      },
      candleCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 300 },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ScreenshotSettings');
  },
};