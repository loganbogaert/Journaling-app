'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Trades', 'notes', {
      type: Sequelize.TEXT,
      allowNull: true,
      after: 'result',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Trades', 'notes');
  },
};
