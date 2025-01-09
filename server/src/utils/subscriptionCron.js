/* const { UserSubscription, UserModelRequest } = require('../../db/models');
const { Op } = require('sequelize');

async function subscription() {
  console.log('🕒 [CRON JOB] Запуск обновления подписок и лимитов...');
  try {
    const now = new Date();
    const nextMonth = new Date(new Date().setMonth(now.getMonth() + 1));

    // 1. Продлеваем истёкшие бесплатные подписки
    const expiredFreeSubs = await UserSubscription.findAll({
      where: {
        subscription_id: 1,
        end_date: { [Op.lte]: now },
      },
      attributes: ['user_id'],
    });

    if (expiredFreeSubs.length > 0) {
      // Обновляем их
      const updatedCount = await UserSubscription.update(
        {
          start_date: now,
          end_date: nextMonth,
        },
        {
          where: {
            subscription_id: 1,
            end_date: { [Op.lte]: now },
          },
        }
      );
      console.log(`✅ Бесплатные подписки обновлены: ${updatedCount[0]} записей`);

      // Сбрасываем лимиты только этим user_id
      const userIds = expiredFreeSubs.map((sub) => sub.user_id);
      const resetCount = await UserModelRequest.update(
        { request_count: 0 },
        {
          where: {
            user_id: { [Op.in]: userIds },
          },
        }
      );
      console.log(`✅ Лимиты для продлённых бесплатных подписок сброшены: ${resetCount[0]} записей`);
    } else {
      console.log('✅ Нет истёкших бесплатных подписок для обновления.');
    }

    // 2. Переводим истёкшие платные подписки на бесплатную
    const expiredPaidSubs = await UserSubscription.findAll({
      where: {
        subscription_id: { [Op.ne]: 1 }, // платные подписки
        end_date: { [Op.lte]: now },
      },
      attributes: ['user_id'],
    });

    if (expiredPaidSubs.length > 0) {
      // Обновляем
      const downgradedCount = await UserSubscription.update(
        {
          subscription_id: 1,
          start_date: now,
          end_date: nextMonth,
        },
        {
          where: {
            subscription_id: { [Op.ne]: 1 },
            end_date: { [Op.lte]: now },
          },
        }
      );
      console.log(`✅ Истекшие платные подписки переведены на бесплатные: ${downgradedCount[0]} записей`);

      // Сбрасываем лимиты только этим user_id
      const userIds = expiredPaidSubs.map((sub) => sub.user_id);
      const resetCount = await UserModelRequest.update(
        { request_count: 0 },
        {
          where: {
            user_id: { [Op.in]: userIds },
          },
        }
      );
      console.log(`✅ Лимиты для пользователей с обновлённой бесплатной подпиской сброшены: ${resetCount[0]} записей`);
    } else {
      console.log('✅ Нет истёкших платных подписок для перевода на бесплатную.');
    }

    console.log('✅ [CRON JOB] Обновление подписок и лимитов завершено');
  } catch (error) {
    console.error('❌ Ошибка в Cron Job:', error.message);
  }
}

module.exports = { subscription }; */

const { UserSubscription, UserModelRequest } = require('../../db/models');
const { Op } = require('sequelize');
const loggerWinston = require('../utils/loggerWinston'); 

async function subscription() {
  loggerWinston.info('🕒 [CRON JOB] Запуск обновления подписок и лимитов...');
  try {
    const now = new Date();
    const nextMonth = new Date(new Date().setMonth(now.getMonth() + 1));

    // 1. Продлеваем истёкшие бесплатные подписки
    const expiredFreeSubs = await UserSubscription.findAll({
      where: {
        subscription_id: 1,
        end_date: { [Op.lte]: now },
      },
      attributes: ['user_id'],
    });

    if (expiredFreeSubs.length > 0) {
      const updatedCount = await UserSubscription.update(
        {
          start_date: now,
          end_date: nextMonth,
        },
        {
          where: {
            subscription_id: 1,
            end_date: { [Op.lte]: now },
          },
        }
      );
      loggerWinston.info(`✅ Бесплатные подписки обновлены: ${updatedCount[0]} записей`);

      const userIds = expiredFreeSubs.map((sub) => sub.user_id);
      const resetCount = await UserModelRequest.update(
        { request_count: 0 },
        {
          where: {
            user_id: { [Op.in]: userIds },
          },
        }
      );
      loggerWinston.info(`✅ Лимиты для продлённых бесплатных подписок сброшены: ${resetCount[0]} записей`);
    } else {
      loggerWinston.info('✅ Нет истёкших бесплатных подписок для обновления.');
    }

    // 2. Переводим истёкшие платные подписки на бесплатную
    const expiredPaidSubs = await UserSubscription.findAll({
      where: {
        subscription_id: { [Op.ne]: 1 },
        end_date: { [Op.lte]: now },
      },
      attributes: ['user_id'],
    });

    if (expiredPaidSubs.length > 0) {
      const downgradedCount = await UserSubscription.update(
        {
          subscription_id: 1,
          start_date: now,
          end_date: nextMonth,
        },
        {
          where: {
            subscription_id: { [Op.ne]: 1 },
            end_date: { [Op.lte]: now },
          },
        }
      );
      loggerWinston.info(`✅ Истекшие платные подписки переведены на бесплатные: ${downgradedCount[0]} записей`);

      const userIds = expiredPaidSubs.map((sub) => sub.user_id);
      const resetCount = await UserModelRequest.update(
        { request_count: 0 },
        {
          where: {
            user_id: { [Op.in]: userIds },
          },
        }
      );
      loggerWinston.info(`✅ Лимиты для пользователей с обновлённой бесплатной подпиской сброшены: ${resetCount[0]} записей`);
    } else {
      loggerWinston.info('✅ Нет истёкших платных подписок для перевода на бесплатную.');
    }

    loggerWinston.info('✅ [CRON JOB] Обновление подписок и лимитов завершено');
  } catch (error) {
    loggerWinston.error(`❌ Ошибка в Cron Job: ${error.message}`);
  }
}

module.exports = { subscription };

