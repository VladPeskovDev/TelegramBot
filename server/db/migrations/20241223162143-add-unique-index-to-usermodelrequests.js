'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex('UserModelRequests', ['user_id', 'subscription_id', 'model_id'], {
      unique: true,
      name: 'user_subscription_model_unique'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('UserModelRequests', 'user_subscription_model_unique');
  }
};
