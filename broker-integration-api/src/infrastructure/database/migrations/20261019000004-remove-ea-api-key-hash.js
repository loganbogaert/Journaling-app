'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.removeColumn(
      { tableName: 'BrokerConnections', schema: 'broker_sync' },
      'apiKeyHash',
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      { tableName: 'BrokerConnections', schema: 'broker_sync' },
      'apiKeyHash',
      { type: Sequelize.STRING(64), allowNull: true, unique: true },
    );
  },
};