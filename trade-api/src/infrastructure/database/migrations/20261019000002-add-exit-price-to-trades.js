'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Trades', 'exit', {
      type: Sequelize.DECIMAL(10, 4),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Trades', 'exit');
  },
};