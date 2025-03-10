'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Данные для таблицы Users
    await queryInterface.bulkInsert(
      'Users',
      [
        {
          telegram_id: 96800740,
          username: 'VladislavPeskov',
          first_name: 'Vladislav',
          last_name: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {},
    );

    // Данные для таблицы Subscriptions
    await queryInterface.bulkInsert(
      'Subscriptions',
      [
        {
          name: 'Free Plan',
          price: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'Standart Plan',
          price: 149,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'Standart Plus Plan',
          price: 299,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'Premium Plan',
          price: 899,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'Numerolog Standart Plan',
          price: 99,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'Numerolog Premium Plan',
          price: 199,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {},
    );

    // Данные для таблицы UserSubscriptions
    await queryInterface.bulkInsert(
      'UserSubscriptions',
      [
        {
          user_id: 1, // ID первого пользователя
          subscription_id: 4, // ID подписки
          start_date: new Date(),
          end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)), // +1 месяц
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {},
    );

    // Данные для таблицы GPTModels
    await queryInterface.bulkInsert(
      'GPTModels',
      [
        {
          name: 'GPT-3.5 Turbo',   //GPT-3.5
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'GPT-4о',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'GPT-4o-mini', //gpt-4o-mini
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'GPT-o1-mini',  //o1-mini-2024-09-12
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'Numerolog', //numerologist
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'GPT-o1-image', //numerologist
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ],
      {},
    );

    // Данные для таблицы SubscriptionModelLimits
    await queryInterface.bulkInsert(
      'SubscriptionModelLimits',
      [
        {
          subscription_id: 1, // Free Plan
          model_id: 1, // GPT-3.5
          requests_limit: 75,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          subscription_id: 1, // Free Plan
          model_id: 2, // gpt-4o
          requests_limit: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          subscription_id: 1, // Free Plan
          model_id: 3, // gpt-4o-mini-2024-07-18
          requests_limit: 35,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          subscription_id: 1, // Free Plan
          model_id: 4, // o1-mini-2024-09-12
          requests_limit: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          subscription_id: 1, // Free Plan
          model_id: 5, // numerolog
          requests_limit: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          subscription_id: 1, // Free Plan
          model_id: 6, // 
          requests_limit: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          subscription_id: 2, // Standart Plan
          model_id: 1, // GPT-3.5
          requests_limit: 150,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          subscription_id: 2,
          model_id: 2, // GPT-4
          requests_limit: 15,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          subscription_id: 2,
          model_id: 3, // GPT-4o-mini
          requests_limit: 50,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          subscription_id: 2,
          model_id: 4, // o1-mini-2024-09-12
          requests_limit: 25,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          subscription_id: 2,
          model_id: 5, // numerolog
          requests_limit: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          subscription_id: 2,
          model_id: 6, // image
          requests_limit: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          subscription_id: 3, // Standart Plus Plan
          model_id: 1, // GPT-3.5
          requests_limit: 300,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          subscription_id: 3,
          model_id: 2, // GPT-4
          requests_limit: 30,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          subscription_id: 3,
          model_id: 2, // GPT-4o-mini
          requests_limit: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          subscription_id: 3, // Standart Plus Plan
          model_id: 4, // o1-mini-2024-09-12
          requests_limit: 50,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          subscription_id: 3, // Standart Plus Plan
          model_id: 5, // numerologist
          requests_limit: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          subscription_id: 3, // Standart Plus Plan
          model_id: 6, // image
          requests_limit: 12,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          subscription_id: 4, // Premium Plan
          model_id: 1, // GPT-3.5
          requests_limit: 1000,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          subscription_id: 4,
          model_id: 2, // GPT-4
          requests_limit: 50,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          subscription_id: 4,
          model_id: 3, // GPT-4o-mini
          requests_limit: 250,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          subscription_id: 4, // Premium Plan
          model_id: 4, // o1-mini-2024-09-12
          requests_limit: 75,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          subscription_id: 4, // Premium Plan
          model_id: 5, // numerologist
          requests_limit: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          subscription_id: 4, // Premium Plan
          model_id: 6, // image
          requests_limit: 25,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          subscription_id: 5, // Numerologist Standart Plan
          model_id: 1,
          requests_limit: 75,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          subscription_id: 5,
          model_id: 2,
          requests_limit: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          subscription_id: 5,
          model_id: 3,
          requests_limit: 25,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          subscription_id: 5,
          model_id: 4, // o1
          requests_limit: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          subscription_id: 5,
          model_id: 5, // Numerologist
          requests_limit: 15,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          subscription_id: 5,
          model_id: 6, 
          requests_limit: 15,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          subscription_id: 6, // Numerologist Standart Plus Plan
          model_id: 1,
          requests_limit: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          subscription_id: 6, // Numerologist Standart Plus Plan
          model_id: 2,
          requests_limit: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          subscription_id: 6, // Numerologist Standart Plus Plan
          model_id: 3,
          requests_limit: 50,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          subscription_id: 6, // Numerologist Standart Plus Plan
          model_id: 4,
          requests_limit: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          subscription_id: 6, 
          model_id: 5,
          requests_limit: 30,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          subscription_id: 6, 
          model_id: 6,
          requests_limit: 30,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {},
    );
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
