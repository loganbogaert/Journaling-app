'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Pairs', [
      { id: 1, pair: 'BTCUSDC' },
      { id: 2, pair: 'ETHUSDC' },
      { id: 3, pair: 'XAUUSD'  },
      { id: 4, pair: 'SP500'   },
      { id: 5, pair: 'OILUSD'   },
      { id: 6, pair: 'SOLUSDC'   },
      { id: 7, pair: 'NASDAQ'   }
    ], { ignoreDuplicates: true });
    await queryInterface.sequelize.query(`
      SELECT setval(
        pg_get_serial_sequence('"Pairs"', 'id'),
        COALESCE(MAX(id), 1),
        MAX(id) IS NOT NULL
      )
      FROM "Pairs"
    `);
  },

  async down (queryInterface, Sequelize) {
    return queryInterface.bulkDelete('Pairs', null, {});
  }
};
