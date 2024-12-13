'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Данные для таблицы Users
    await queryInterface.bulkInsert('Users', [
      {
        telegram_id: 96800740,
        username: 'VladislavPeskov',
        first_name: 'Vladislav',
        last_name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], {});

    // Данные для таблицы Subscriptions
    await queryInterface.bulkInsert('Subscriptions', [
      {
        name: 'Free Plan',
        price: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Basic Plan',
        price: 9.99,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Premium Plan',
        price: 19.99,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], {});

    // Данные для таблицы UserSubscriptions
    await queryInterface.bulkInsert('UserSubscriptions', [
      {
        user_id: 1, // ID первого пользователя
        subscription_id: 1, // ID подписки Free Plan
        start_date: new Date(),
        end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)), // +1 месяц
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], {});

    // Данные для таблицы GPTModels
    await queryInterface.bulkInsert('GPTModels', [
      {
        name: 'GPT-3.5',
        max_requests: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'GPT-4',
        max_requests: 20,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'gpt-4o-mini-2024-07-18',
        max_requests: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], {});

    // Данные для таблицы SubscriptionModelLimits
    await queryInterface.bulkInsert('SubscriptionModelLimits', [
      {
        subscription_id: 1, // Free Plan
        model_id: 1, // GPT-3.5
        requests_limit: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        subscription_id: 1, // Free Plan
        model_id: 3, // gpt-4o-mini-2024-07-18
        requests_limit: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        subscription_id: 2, // Basic Plan
        model_id: 1, // GPT-3.5
        requests_limit: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        subscription_id: 2, // Basic Plan
        model_id: 2, // GPT-4
        requests_limit: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        subscription_id: 3, // Premium Plan
        model_id: 1, // GPT-3.5
        requests_limit: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        subscription_id: 3, // Premium Plan
        model_id: 2, // GPT-4
        requests_limit: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], {});
  },

  async down(queryInterface, Sequelize) {
    // Удаление данных из всех таблиц
    await queryInterface.bulkDelete('SubscriptionModelLimits', null, {});
    await queryInterface.bulkDelete('GPTModels', null, {});
    await queryInterface.bulkDelete('UserSubscriptions', null, {});
    await queryInterface.bulkDelete('Subscriptions', null, {});
    await queryInterface.bulkDelete('Users', null, {});
  },
};
