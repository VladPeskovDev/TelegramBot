const axios = require('../utils/axiosInstance');

// Храним текущие модели пользователей
const userModels = {};

module.exports = (bot) => {
  // Команда выбора модели
  bot.onText(/\/model/, (msg) => {
    const chatId = String(msg.chat.id);

    const options = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🤖 GPT-3.5', callback_data: 'GPT-3.5' },
            { text: '🏅 GPT-4', callback_data: 'GPT-4' },
            { text: '⚡ gpt-4o-mini', callback_data: 'gpt-4o-mini' },
          ],
        ],
      },
    };

    bot.sendMessage(chatId, 'Выберите модель:', options);
  });

  // Обработка выбора модели
  bot.on('callback_query', async (callbackQuery) => {
    const chatId = String(callbackQuery.message.chat.id);
    const chosenModel = callbackQuery.data;

    let endpoint;

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

    userModels[chatId] = { modelName: chosenModel, endpoint };

    bot.answerCallbackQuery(callbackQuery.id, { text: `Вы выбрали модель ${chosenModel}.` });
    bot.sendMessage(chatId, `Вы успешно переключились на модель ${chosenModel}.`);
  });

  // Обработка текстовых сообщений
  bot.on('message', async (msg) => {
    const chatId = String(msg.chat.id);
    const userMessage = msg.text;

    if (!userMessage || userMessage.startsWith('/')) {
      return;
    }

    const userModel = userModels[chatId] || { modelName: 'GPT-3.5', endpoint: '/api/openai/model3.5' };

    try {
      const response = await axios.post(userModel.endpoint, {
        chatId,
        userMessage,
        modelName: userModel.modelName,
      });

      const botResponse = response.data.reply;

      bot.sendMessage(chatId, botResponse);
    } catch (error) {
      console.error('Ошибка при обработке сообщения:', error);
      const errorMessage =
        error.response?.data?.error || 'Произошла ошибка. Пожалуйста, попробуйте позже.';
      bot.sendMessage(chatId, errorMessage);
    }
  });
};
