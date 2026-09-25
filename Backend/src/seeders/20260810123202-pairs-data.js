'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    return queryInterface.bulkInsert('Pairs', [
      { id: 1, pair: 'BTCUSDC' },
      { id: 2, pair: 'ETHUSDC' },
      { id: 3, pair: 'XAUUSD'  },
      { id: 4, pair: 'SP500'   },
      { id: 5, pair: 'OILUSD'   },
      { id: 6, pair: 'SOLUSDC'   },
      { id: 7, pair: 'NASDAQ'   }
    ], { ignoreDuplicates: true });
  },

  async down (queryInterface, Sequelize) {
    return queryInterface.bulkDelete('Pairs', null, {});
  }
};
