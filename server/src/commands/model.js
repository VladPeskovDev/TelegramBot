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
            { text: '🧠 GPT-4o', callback_data: 'GPT-4o' }
          ],
          [
            { text: '⚡ gpt-4o-mini', callback_data: 'gpt-4o-mini' },
            { text: '🆕 o1-mini-NEW', callback_data: 'o1-mini-NEW' }
          ]
        ]
      }
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
      case 'GPT-4o':
        endpoint = '/api/openai/model4';
        break;
      case 'gpt-4o-mini':
        endpoint = '/api/openai/model_gpt-4o-mini';
        break;
      case 'o1-mini-NEW':
        endpoint = '/api/openaiO1/model_o1-mini-2024-09-12';
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

    let processingMessageId;

    try {
      // 🔄 Отправляем временное сообщение
      const processingMessage = await bot.sendMessage(
        chatId,
        '⏳ *Обрабатываем ваш запрос, пожалуйста, подождите...*',
        { parse_mode: 'Markdown' }
      );

      processingMessageId = processingMessage.message_id;

      // ⏳ Запрашиваем ответ у OpenAI
      const response = await axios.post(userModel.endpoint, {
        chatId,
        userMessage,
        modelName: userModel.modelName,
      });

      const botResponse = response.data.reply;

      // ✅ Удаляем временное сообщение
      await bot.deleteMessage(chatId, processingMessageId);

      // 📩 Отправляем окончательный ответ
      bot.sendMessage(chatId, `🤖 *Ответ:* \n${botResponse}`, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('❌ Ошибка при обработке сообщения:', error);

      // ❗ Удаляем временное сообщение в случае ошибки
      if (processingMessageId) {
        await bot.deleteMessage(chatId, processingMessageId);
      }

      const errorMessage =
        error.response?.data?.error || '❌ *Произошла ошибка. Попробуйте позже.*';

      bot.sendMessage(chatId, errorMessage, { parse_mode: 'Markdown' });
    }
  });
};
