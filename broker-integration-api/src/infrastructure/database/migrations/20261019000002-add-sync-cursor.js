'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = { tableName: 'BrokerConnections', schema: 'broker_sync' };
    await queryInterface.addColumn(table, 'lastDealId', { type: Sequelize.STRING(64), allowNull: true });
    await queryInterface.addColumn(table, 'lastDealTime', { type: Sequelize.DATE, allowNull: true });
  },

  async down(queryInterface) {
    const table = { tableName: 'BrokerConnections', schema: 'broker_sync' };
    await queryInterface.removeColumn(table, 'lastDealTime');
    await queryInterface.removeColumn(table, 'lastDealId');
  },
};