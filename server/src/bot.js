const TelegramBot = require('node-telegram-bot-api');
const { User } = require('../db/models'); 
require('dotenv').config();
const axios = require('axios');


const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

bot.setMyCommands([
  { command: '/start', description: 'Начать взаимодействие с ботом' },
  { command: '/info', description: 'Получить информацию о боте' },
  { command: '/help', description: 'Помощь по использованию бота' },
  { command: '/feedback', description: 'Связаться с нами' },
]);


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
      bot.sendMessage(chatId, 'Вы успешно зарегистрированы! Можете начинать пользоваться ботом.');
    } else {
      await user.update({
        username: username || user.username,
        first_name: first_name || user.first_name,
        last_name: last_name || user.last_name,
      });

      bot.sendMessage(chatId, 'Добро пожаловать обратно! Ваши данные обновлены.');
    }
  } catch (error) {
    console.error('Ошибка при регистрации пользователя:', error);
    bot.sendMessage(chatId, 'Произошла ошибка при регистрации. Попробуйте позже.');
  }
});


// Команда /info — информация о боте
bot.onText(/\/info/, (msg) => {
  const chatId = String(msg.chat.id);
  const infoMessage = `
    Это бот, который использует возможности OpenAI для генерации ответов на ваши запросы.
    Доступно несколько уровней подписки и моделей. Используйте /help для помощи.
  `;
  bot.sendMessage(chatId, infoMessage);
});


// Команда /help — справка по боту
bot.onText(/\/help/, (msg) => {
  const chatId = String(msg.chat.id);
  const helpMessage = `
    Команды бота:
    - /start: Зарегистрироваться и начать использование.
    - /info: Узнать информацию о боте.
    - /feedback: Связаться с поддержкой.
    Просто отправьте сообщение, чтобы получить ответ от OpenAI.
  `;
  bot.sendMessage(chatId, helpMessage);
});

// Обработка текстовых сообщений
bot.on('message', async (msg) => {
  const chatId = String(msg.chat.id);
  const userMessage = msg.text;

  if (!userMessage || userMessage.startsWith('/')) {
    // Игнорируем команды и пустые сообщения
    return;
  }

  try {
    // Отправляем сообщение на сервер для обработки
    const response = await axios.post('https://4793-5-228-83-19.ngrok-free.app/api/openai', {
      chatId,
      userMessage,
      modelName: 'gpt-4o-mini-2024-07-18',
    });

    const botResponse = response.data.reply;

    // Отправляем ответ пользователю
    bot.sendMessage(chatId, botResponse, {pasre_mode: "MarkdownV2"});
  } catch (error) {
    console.error('Ошибка при обработке сообщения:', error);

    const errorMessage =
      error.response?.data?.error || 'Произошла ошибка. Пожалуйста, попробуйте позже.';
    bot.sendMessage(chatId, errorMessage);
  }
});

module.exports = bot;




//ngrok http 5173