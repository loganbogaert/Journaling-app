'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop the FK to the local Users table now that Keycloak owns identity
    await queryInterface.removeConstraint('Sessions', 'Sessions_userId_fkey');

    await queryInterface.changeColumn('Sessions', 'userId', {
      // Keycloak subject (`sub` claim) — a UUID string, not a local integer id anymore
      type: Sequelize.STRING(36),
      allowNull: false,
    });

    await queryInterface.dropTable('Users');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.createTable('Users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING,
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

    await queryInterface.changeColumn('Sessions', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });

    await queryInterface.addConstraint('Sessions', {
      fields: ['userId'],
      type: 'foreign key',
      name: 'Sessions_userId_fkey',
      references: { table: 'Users', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
  },
};
