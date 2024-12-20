module.exports = (bot) => {
    bot.onText(/\/info/, (msg) => {
      const chatId = String(msg.chat.id);
      const infoMessage = `
        Это бот, который использует возможности OpenAI для генерации ответов на ваши запросы.
        Доступно несколько уровней подписки и моделей. Используйте /help для помощи.
      `;
      bot.sendMessage(chatId, infoMessage);
    });
  };
  