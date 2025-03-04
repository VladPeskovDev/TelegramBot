const cache = require('../utils/cacheRedis');

const handleResetCommand = (bot) => {
  bot.onText(/\/reset/, async (msg) => {
    const chatId = String(msg.chat.id);

    try {
      // Сбрасываем контекст пользователя
      const contextKeys = [
        `user_${chatId}_o1-mini-2024-09-12_context`,
        `user_${chatId}_gpt-4o-mini_context`,
        `user_${chatId}_model4_context`,
        `user_${chatId}_model3.5_context`,
        `user_${chatId}_numerologist_context`,
      ];

      let clearedContexts = 0;

      for (const key of contextKeys) {
        // 1) Асинхронно получаем данные
        const existing = await cache.getCache(key);
        // 2) Если есть, удаляем
        if (existing) {
          await cache.delCache(key); // Тоже асинхронно
          clearedContexts++;
        }
      }

      if (clearedContexts > 0) {
        bot.sendMessage(
          chatId,
          '✅ *Контекст успешно сброшен*',
          { parse_mode: 'Markdown' }
        );
      } else {
        bot.sendMessage(
          chatId,
          `ℹ️ *Контекст уже пуст. Нет данных для сброса.*`,
          { parse_mode: 'Markdown' }
        );
      }
    } catch (error) {
      console.error('❌ Ошибка при сбросе контекста:', error.message);
      bot.sendMessage(
        chatId,
        `❌ *Произошла ошибка при сбросе контекста. Попробуйте позже.*`,
        { parse_mode: 'Markdown' }
      );
    }
  });
};

module.exports = { handleResetCommand };

