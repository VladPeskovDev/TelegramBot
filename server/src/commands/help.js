module.exports = (bot) => {
    bot.onText(/\/help/, (msg) => {
      const chatId = String(msg.chat.id);
      const helpMessage = `
        Команды бота:
        - 🚀 /start: Зарегистрироваться и начать использование.
        - ℹ️ /info: Узнать информацию о боте.
        - ❓ /feedback: Связаться с поддержкой.
        - 🛠 /model: Выбрать модель нейронной сети.
        - 💳 /subscription: Выбрать и оплатить подписку.
        - 👤 /account: Узнать информацию о вашем аккаунте.
        - ✉️ /feedback: Связаться с нами.
      `;
      bot.sendMessage(chatId, helpMessage);
    });
  };
  