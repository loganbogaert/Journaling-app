'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable({ tableName: 'BrokerConnections', schema: 'broker_sync' }, {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      accountId: { type: Sequelize.INTEGER, allowNull: false, unique: true },
      userId: { type: Sequelize.STRING(36), allowNull: false },
      platform: { type: Sequelize.ENUM('mt4', 'mt5'), allowNull: false },
      brokerLogin: { type: Sequelize.STRING(64), allowNull: false },
      brokerServer: { type: Sequelize.STRING(255), allowNull: false },
      apiKeyHash: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      status: {
        type: Sequelize.ENUM('pending', 'active', 'disabled'),
        allowNull: false,
        defaultValue: 'pending',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable({ tableName: 'BrokerConnections', schema: 'broker_sync' });
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "broker_sync"."enum_BrokerConnections_platform"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "broker_sync"."enum_BrokerConnections_status"');
  },
};