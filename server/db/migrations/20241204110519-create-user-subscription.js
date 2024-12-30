'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('UserSubscriptions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users', // Ссылается на таблицу Users
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      subscription_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Subscriptions', // Ссылается на таблицу Subscriptions
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      start_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      end_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Добавляем уникальный индекс
    await queryInterface.addIndex('UserSubscriptions', ['user_id', 'subscription_id'], {
      unique: true,
      name: 'user_subscription_unique',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('UserSubscriptions', 'user_subscription_unique');
    await queryInterface.dropTable('UserSubscriptions');
  },
};
