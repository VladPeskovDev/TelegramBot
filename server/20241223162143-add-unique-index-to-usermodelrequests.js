/* 'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex('UserModelRequests', ['user_id', 'model_id'], {
      unique: true,
      name: 'user_model_unique'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('UserModelRequests', 'user_model_unique');
  }
};
*/