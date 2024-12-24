const { UserSubscription, UserModelRequest } = require('../../db/models');
const { Op } = require('sequelize');


async function subscription() {
  console.log('🕒 [CRON JOB] Запуск обновления подписок и лимитов...');

  try {
    // 1️⃣ Обновляем бесплатные подписки (продлеваем лимиты на месяц)
    const updatedFreeSubscriptions = await UserSubscription.update(
      { end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)) },
      {
        where: {
          subscription_id: 1, 
          end_date: { [Op.lte]: new Date() }
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
                  subscription_id: 1, // ID бесплатной подписки
                  end_date: { [Op.lte]: new Date() }
                }
              })
            ).map((sub) => sub.user_id)
          }
        }
      }
    );
    console.log(`✅ Лимиты для бесплатных подписок сброшены: ${resetFreeLimits[0]} записей`);

    // 3️⃣ Переключаем истекшие платные подписки на бесплатные
    const downgradedSubscriptions = await UserSubscription.update(
      {
        subscription_id: 1, // ID бесплатной подписки
        end_date: new Date(new Date().setMonth(new Date().getMonth() + 1))
      },
      {
        where: {
          subscription_id: { [Op.ne]: 1 }, // Не бесплатная подписка
          end_date: { [Op.lte]: new Date() }
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
                  subscription_id: 1, // ID бесплатной подписки
                  end_date: { [Op.gte]: new Date() }
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



//обновляется только enddate надо обновлять также startdate и ставить время начала новой подписки на тот момент когда срабатыыает скрипт