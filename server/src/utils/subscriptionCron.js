const { UserSubscription, UserModelRequest } = require('../../db/models');
const { Op } = require('sequelize');

async function subscription() {
  console.log('🕒 [CRON JOB] Запуск обновления подписок и лимитов...');

  try {
    const now = new Date(); // Текущее время
    const nextMonth = new Date(new Date().setMonth(now.getMonth() + 1)); // Текущая дата + 1 месяц

    // 1️⃣ Обновляем бесплатные подписки (продлеваем лимиты на месяц, обновляем start_date)
    const updatedFreeSubscriptions = await UserSubscription.update(
      {
        start_date: now,
        end_date: nextMonth
      },
      {
        where: {
          subscription_id: 1, // Бесплатная подписка
          end_date: { [Op.lte]: now }
        }
      }
    );
    console.log(`✅ Бесплатные подписки обновлены: ${updatedFreeSubscriptions[0]} записей`);

    // 2️⃣ Сбрасываем лимиты для бесплатных пользователей
    const resetFreeLimits = await UserModelRequest.update(
      { request_count: 0 },
      {
        where: {
          user_id: {
            [Op.in]: (
              await UserSubscription.findAll({
                attributes: ['user_id'],
                where: {
                  subscription_id: 1,
                  end_date: { [Op.lte]: now }
                }
              })
            ).map((sub) => sub.user_id)
          }
        }
      }
    );
    console.log(`✅ Лимиты для бесплатных подписок сброшены: ${resetFreeLimits[0]} записей`);

    // 3️⃣ Переключаем истекшие платные подписки на бесплатные (обновляем start_date и end_date)
    const downgradedSubscriptions = await UserSubscription.update(
      {
        subscription_id: 1, // ID бесплатной подписки
        start_date: now,
        end_date: nextMonth
      },
      {
        where: {
          subscription_id: { [Op.ne]: 1 }, // Исключаем бесплатную подписку
          end_date: { [Op.lte]: now }
        }
      }
    );
    console.log(`✅ Истекшие платные подписки переведены на бесплатные: ${downgradedSubscriptions[0]} записей`);

    // 4️⃣ Сбрасываем лимиты для пользователей с обновленной бесплатной подпиской
    const resetPaidToFreeLimits = await UserModelRequest.update(
      { request_count: 0 },
      {
        where: {
          user_id: {
            [Op.in]: (
              await UserSubscription.findAll({
                attributes: ['user_id'],
                where: {
                  subscription_id: 1,
                  end_date: { [Op.gte]: now }
                }
              })
            ).map((sub) => sub.user_id)
          }
        }
      }
    );
    console.log(`✅ Лимиты для пользователей с обновленной бесплатной подпиской сброшены: ${resetPaidToFreeLimits[0]} записей`);

    console.log('✅ [CRON JOB] Обновление подписок и лимитов завершено');
  } catch (error) {
    console.error('❌ Ошибка в Cron Job:', error.message);
  }
}

module.exports = { subscription };

