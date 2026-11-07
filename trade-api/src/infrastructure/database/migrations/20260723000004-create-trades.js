'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Trades', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      sessionId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Sessions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      pairId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Pairs', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      entryDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      exitDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      direction: {
        type: Sequelize.ENUM('long', 'short'),
        allowNull: false,
      },
      rr: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      risk: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      fee: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
      },
      result: {
        type: Sequelize.ENUM('W', 'BE', 'L'),
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Trades');
  },
};
