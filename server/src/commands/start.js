const { User, UserSubscription, Subscription } = require('../../db/models');

module.exports = (bot) => {
  bot.onText(/\/start/, async (msg) => {
    const chatId = String(msg.chat.id);
    const { username, first_name, last_name } = msg.chat;

    try {
      const [user, created] = await User.findOrCreate({
        where: { telegram_id: chatId },
        defaults: {
          telegram_id: chatId,
          username: username || null,
          first_name: first_name || null,
          last_name: last_name || null,
        },
      });

      if (created) {
        const freePlan = await Subscription.findOne({ where: { name: 'Free Plan' } });
        if (freePlan) {
          await UserSubscription.create({
            user_id: user.id,
            subscription_id: freePlan.id,
            start_date: new Date(),
            end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)),
          });
          bot.sendMessage(chatId, 'Вы успешно зарегистрированы! Вам назначена подписка Free Plan.');
        } else {
          bot.sendMessage(chatId, 'Вы зарегистрированы, но подписка не назначена. Свяжитесь с поддержкой.');
        }
      } else {
        bot.sendMessage(chatId, 'Добро пожаловать обратно!');
      }
    } catch (error) {
      console.error('Ошибка при регистрации пользователя:', error);
      bot.sendMessage(chatId, 'Произошла ошибка при регистрации. Попробуйте позже.');
    }
  });
};
