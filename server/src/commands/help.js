module.exports = (bot) => {
    bot.onText(/\/help/, (msg) => {
      const chatId = String(msg.chat.id);
      const helpMessage = `
        Команды бота:
        - /start: Зарегистрироваться и начать использование.
        - /info: Узнать информацию о боте.
        - /feedback: Связаться с поддержкой.
        - /model: Выбрать модель нейронной сети.
        - /subscription: Выбрать и оплатить подписку.
        - /account: Узнать информацию о вашем аккаунте.
      `;
      bot.sendMessage(chatId, helpMessage);
    });
  };
  