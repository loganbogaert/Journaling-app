'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Trades', 'rr');

    await queryInterface.addColumn('Trades', 'entry', {
      type: Sequelize.DECIMAL(10, 4),
      allowNull: false,
      defaultValue: 0,
      after: 'pairId',
    });
    await queryInterface.addColumn('Trades', 'tp', {
      type: Sequelize.DECIMAL(10, 4),
      allowNull: false,
      defaultValue: 0,
      after: 'entry',
    });
    await queryInterface.addColumn('Trades', 'sl', {
      type: Sequelize.DECIMAL(10, 4),
      allowNull: false,
      defaultValue: 0,
      after: 'tp',
    });
    await queryInterface.addColumn('Trades', 'profit', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      after: 'fee',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Trades', 'entry');
    await queryInterface.removeColumn('Trades', 'tp');
    await queryInterface.removeColumn('Trades', 'sl');
    await queryInterface.removeColumn('Trades', 'profit');

    await queryInterface.addColumn('Trades', 'rr', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    });
  },
};
