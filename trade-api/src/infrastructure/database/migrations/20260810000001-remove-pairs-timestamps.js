'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.removeColumn('Pairs', 'createdAt');
    await queryInterface.removeColumn('Pairs', 'updatedAt');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('Pairs', 'createdAt', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    });
    await queryInterface.addColumn('Pairs', 'updatedAt', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    });
  },
};
