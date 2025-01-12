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
          bot.sendMessage(
            chatId,
            `*🤖 Привет\\!*  
          
          Этот бот открывает вам доступ к *лучшим нейросетям* для создания текста и решения любых задач\\.  
          *Здесь доступны новые модели:*  
          🆕 *GPT\\-o1 mini*  
          🧠 *GPT\\-4o*  
          ⚡ *GPT\\-4o mini *   
          📚 *И другие\\.\\.\\.*  
          
          🆓 *Бесплатно:* GPT\\-4o mini  
          
          *Чатбот умеет:*  
          
          1️⃣ *Писать и переводить тексты*  
          2️⃣ *Писать рефераты и курсовые работы*  
          3️⃣ *Работать с документами*  
          4️⃣ *Писать и редактировать код*  
          5️⃣ *Решать задачи по математике*  
          6️⃣ *Быть личным нумерологом*  
          7️⃣ *Писать жалобы, обращения и исковые заявления*  
          8️⃣ *Создавать контент для социальных сетей*  
          9️⃣ *Подсказывать идеи для креативных проектов и дизайна*
          
          📲 _Выберите команду, чтобы начать\\!_`,
            {
              parse_mode: 'MarkdownV2',
            }
          );
          
          
        } else {
          bot.sendMessage(chatId, 'Вы зарегистрированы, но подписка не назначена. Свяжитесь с поддержкой.');
        }
      } else {
        bot.sendMessage(
          chatId,
          `*🤖 С возвращением\\!*  
        
        Этот бот открывает вам доступ к *лучшим нейросетям* для создания текста и решения любых задач\\.  
        *Здесь доступны новые модели:*  
        🆕 *GPT\\-o1 mini*  
        🧠 *GPT\\-4o*  
        ⚡ *GPT\\-4o mini *  
        📚 *И другие\\.\\.\\.*  
        
        🆓 *Бесплатно:* GPT\\-4o mini  
        
        *Чатбот умеет:*  
        
        1️⃣ *Писать и переводить тексты*  
        2️⃣ *Писать рефераты и курсовые работы*  
        3️⃣ *Работать с документами*  
        4️⃣ *Писать и редактировать код*  
        5️⃣ *Решать задачи по математике*  
        6️⃣ *Быть личным нумерологом*  
        7️⃣ *Писать жалобы, обращения и исковые заявления*  
        8️⃣ *Создавать контент для социальных сетей*  
        9️⃣ *Подсказывать идеи для креативных проектов и дизайна*
        
        📲 _Выберите команду, чтобы начать\\!_`,
          {
            parse_mode: 'MarkdownV2',
          }
        );
        
      }
    } catch (error) {
      console.error('Ошибка при регистрации пользователя:', error);
      bot.sendMessage(chatId, 'Произошла ошибка при регистрации. Попробуйте позже.');
    }
  });
};
