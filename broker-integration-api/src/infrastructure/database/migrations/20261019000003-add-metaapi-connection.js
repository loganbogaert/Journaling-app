'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = { tableName: 'BrokerConnections', schema: 'broker_sync' };
    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const [name, definition] of Object.entries({
        encryptedPassword: { type: Sequelize.TEXT, allowNull: true },
        metaApiAccountId: { type: Sequelize.STRING, allowNull: true },
        syncedThrough: { type: Sequelize.DATE, allowNull: true },
        syncState: { type: Sequelize.STRING, allowNull: false, defaultValue: 'idle' },
        syncError: { type: Sequelize.STRING, allowNull: true },
        syncResult: { type: Sequelize.JSONB, allowNull: true },
      })) await queryInterface.addColumn(table, name, definition, { transaction });
      await queryInterface.createTable({ tableName: 'ImportedDeals', schema: 'broker_sync' }, {
        accountId: { type: Sequelize.INTEGER, primaryKey: true, allowNull: false },
        externalDealId: { type: Sequelize.STRING(64), primaryKey: true, allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false },
      }, { transaction });
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable({ tableName: 'ImportedDeals', schema: 'broker_sync' });
    const table = { tableName: 'BrokerConnections', schema: 'broker_sync' };
    for (const name of ['encryptedPassword', 'metaApiAccountId', 'syncedThrough', 'syncState', 'syncError', 'syncResult']) {
      await queryInterface.removeColumn(table, name);
    }
  },
};