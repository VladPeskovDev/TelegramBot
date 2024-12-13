const TelegramBot = require('node-telegram-bot-api');
const { User, UserSubscription, Subscription } = require('../db/models'); 
require('dotenv').config();
const axios = require('axios');


const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

bot.setMyCommands([
  { command: '/start', description: 'Начать взаимодействие с ботом' },
  { command: '/info', description: 'Получить информацию о боте' },
  { command: '/help', description: 'Помощь по использованию бота' },
  { command: '/feedback', description: 'Связаться с нами' },
  { command: '/model', description: 'Выбрать модель' },
]);


bot.onText(/\/start/, async (msg) => {
  const chatId = String(msg.chat.id);
  const { username, first_name, last_name } = msg.chat;

  try {
    // Находим или создаём пользователя
    const [user, created] = await User.findOrCreate({
      where: { telegram_id: chatId },
      defaults: {
        telegram_id: chatId,
        username: username || null,
        first_name: first_name || null,
        last_name: last_name || null,
      },
    });

    // Если пользователь новый, привязываем подписку Free Plan
    if (created) {
      const freePlan = await Subscription.findOne({ where: { name: 'Free Plan' } });
      if (freePlan) {
        await UserSubscription.create({
          user_id: user.id,
          subscription_id: freePlan.id,
          start_date: new Date(),
          end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)), // +1 месяц
        });
        bot.sendMessage(chatId, 'Вы успешно зарегистрированы! Вам автоматически назначена подписка Free Plan.');
      } else {
        bot.sendMessage(chatId, 'Вы успешно зарегистрированы, но не удалось назначить подписку. Свяжитесь с поддержкой.');
      }
    } else {
      // Обновляем данные пользователя, если он уже зарегистрирован
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


bot.onText(/\/info/, (msg) => {
  const chatId = String(msg.chat.id);
  const infoMessage = `
    Это бот, который использует возможности OpenAI для генерации ответов на ваши запросы.
    Доступно несколько уровней подписки и моделей. Используйте /help для помощи.
  `;
  bot.sendMessage(chatId, infoMessage);
});


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


// Храним текущие модели пользователей
const userModels = {};

// Команда выбора модели
bot.onText(/\/model/, (msg) => {
  const chatId = String(msg.chat.id);

  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'GPT-3.5', callback_data: 'GPT-3.5' },
          { text: 'GPT-4', callback_data: 'GPT-4' },
          { text: 'gpt-4o-mini', callback_data: 'gpt-4o-mini' },
        ],
      ],
    },
  };

  bot.sendMessage(chatId, 'Выберите модель:', options);
});

// Обработка выбора модели через callback_data
bot.on('callback_query', async (callbackQuery) => {
  const chatId = String(callbackQuery.message.chat.id);
  const chosenModel = callbackQuery.data;

  let endpoint;

  // Назначаем эндпоинт в зависимости от модели
  switch (chosenModel) {
    case 'GPT-3.5':
      endpoint = '/api/openai/model3.5';
      break;
    case 'GPT-4':
      endpoint = '/api/openai/model4';
      break;
    case 'gpt-4o-mini':
      endpoint = '/api/openai/model_gpt-4o-mini';
      break;
    default:
      bot.answerCallbackQuery(callbackQuery.id, { text: 'Неизвестная модель.' });
      return;
  }

  // Сохраняем выбранную модель и эндпоинт для пользователя
  userModels[chatId] = { modelName: chosenModel, endpoint };

  // Отвечаем пользователю
  bot.answerCallbackQuery(callbackQuery.id, { text: `Вы выбрали модель ${chosenModel}.` });
  bot.sendMessage(chatId, `Вы успешно переключились на модель ${chosenModel}.`);
});

// Обработка текстовых сообщений
bot.on('message', async (msg) => {
  const chatId = String(msg.chat.id);
  const userMessage = msg.text;

  if (!userMessage || userMessage.startsWith('/')) {
    // Игнорируем команды и пустые сообщения
    return;
  }

  // Получаем текущую модель пользователя
  const userModel = userModels[chatId] || { modelName: 'GPT-3.5', endpoint: '/api/openai/model3.5' };

  try {
    // Отправляем сообщение на сервер для обработки
    const response = await axios.post(`https://4793-5-228-83-19.ngrok-free.app${userModel.endpoint}`, {
      chatId,
      userMessage,
      modelName: userModel.modelName,
    });

    const botResponse = response.data.reply;

    // Отправляем ответ пользователю
    bot.sendMessage(chatId, botResponse);
  } catch (error) {
    console.error('Ошибка при обработке сообщения:', error);

    const errorMessage =
      error.response?.data?.error || 'Произошла ошибка. Пожалуйста, попробуйте позже.';
    bot.sendMessage(chatId, errorMessage);
  }
});

module.exports = bot;




//ngrok http 5173