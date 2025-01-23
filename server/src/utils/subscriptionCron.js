const { UserSubscription, UserModelRequest } = require('../../db/models');
const { Op } = require('sequelize');
const loggerWinston = require('../metrics/loggerWinston');

async function subscription() {
  loggerWinston.info('🕒 [CRON JOB] Запуск обновления подписок и лимитов...');
  try {
    const now = new Date();
    const nextMonth = new Date(new Date().setMonth(now.getMonth() + 1));

    // Получаем пользователей с истёкшими подписками (бесплатными и платными)
    const expiredSubs = await UserSubscription.findAll({
      where: { end_date: { [Op.lte]: now } },
      attributes: ['user_id', 'subscription_id'],
    });

    if (expiredSubs.length > 0) {
      const freeSubs = expiredSubs.filter((sub) => sub.subscription_id === 1);
      const paidSubs = expiredSubs.filter((sub) => sub.subscription_id !== 1);

      // Обновляем бесплатные подписки
      if (freeSubs.length > 0) {
        const freeUserIds = freeSubs.map((sub) => sub.user_id);
        const updatedCount = await UserSubscription.update(
          {
            start_date: now,
            end_date: nextMonth,
          },
          {
            where: {
              subscription_id: 1,
              user_id: { [Op.in]: freeUserIds },
            },
          }
        );
        loggerWinston.info(`✅ Бесплатные подписки обновлены: ${updatedCount[0]} записей`);

        const resetCount = await UserModelRequest.update(
          { request_count: 0 },
          {
            where: { user_id: { [Op.in]: freeUserIds } },
          }
        );
        loggerWinston.info(`✅ Лимиты для продлённых бесплатных подписок сброшены: ${resetCount[0]} записей`);
      }

      // Переводим платные подписки на бесплатные
      if (paidSubs.length > 0) {
        const paidUserIds = paidSubs.map((sub) => sub.user_id);
        const downgradedCount = await UserSubscription.update(
          {
            subscription_id: 1,
            start_date: now,
            end_date: nextMonth,
          },
          {
            where: {
              subscription_id: { [Op.ne]: 1 },
              user_id: { [Op.in]: paidUserIds },
            },
          }
        );
        loggerWinston.info(`✅ Истекшие платные подписки переведены на бесплатные: ${downgradedCount[0]} записей`);

        const resetCount = await UserModelRequest.update(
          { request_count: 0 },
          {
            where: { user_id: { [Op.in]: paidUserIds } },
          }
        );
        loggerWinston.info(`✅ Лимиты для пользователей с обновлённой бесплатной подпиской сброшены: ${resetCount[0]} записей`);
      }
    } else {
      loggerWinston.info('✅ Нет истёкших подписок для обновления.');
    }

    loggerWinston.info('✅ [CRON JOB] Обновление подписок и лимитов завершено');
  } catch (error) {
    loggerWinston.error(`❌ Ошибка в Cron Job: ${error.message}`);
  }
}

module.exports = { subscription };















