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

    try {
      await bot.deleteMessage(chatId, processingMessageId);
    } catch (err) {
      console.warn('⚠️ Не удалось удалить временное сообщение:', err.message);
    }
    
    if (botResponse.length <= 4000) {
      bot.sendMessage(
        chatId,
        `🤖 *Ответ:* \n${botResponse}`,
        { parse_mode: 'Markdown' }
      );
    } else {
      // Ответ длинный — отправляем в виде txt-файла
      const buffer = Buffer.from(botResponse, 'utf8'); 

      try {
      await bot.deleteMessage(chatId, processingMessageId);
          } catch (err) {
         console.warn('(catch) Не удалось удалить временное сообщение:', err.message);
         }

        // Отправляем документ (txt)
       await bot.sendDocument(
       chatId,
       buffer,                          
      { caption: 'Ответ слишком большой, поэтому во вложении:', parse_mode: 'Markdown' },  
      { filename: 'reply.txt', contentType: 'text/plain' }      
      );

    }
  } catch (error) {
    console.error('❌ Ошибка при обработке сообщения:', error);

   
  // ❗ Удаляем временное сообщение в случае ошибки
  if (processingMessageId) {
    try {
      await bot.deleteMessage(chatId, processingMessageId);
    } catch (delErr) {
      console.warn('⚠️ (catch) Не удалось удалить временное сообщение:', delErr.message);
    }
  }

    const errorMessage =
      error.response?.data?.error || '❌ *Произошла ошибка. Попробуйте позже.*';

    bot.sendMessage(chatId, errorMessage, { parse_mode: 'Markdown' });
  }
});
};

/*

const axios = require('../utils/axiosInstance');
const { userState, userModels } = require('./userState');

module.exports = (bot) => {
  // Команда выбора модели
  bot.onText(/\/model/, (msg) => {
    const chatId = String(msg.chat.id);
    userState[chatId] = 'gpt'; // Устанавливаем состояние пользователя

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
    
    bot.sendMessage(chatId, '🛠 *Выберите модель GPT:*', { parse_mode: 'Markdown', ...options });
  });

  // Обработка выбора модели
  bot.on('callback_query', async (callbackQuery) => {
    const chatId = String(callbackQuery.message.chat.id);
    if (userState[chatId] !== 'gpt') return;

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
        bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Неизвестная модель.' });
        return;
    }

    userModels[chatId] = { modelName: chosenModel, endpoint };

    bot.answerCallbackQuery(callbackQuery.id, { text: `✅ Вы выбрали модель ${chosenModel}.` });
    bot.sendMessage(chatId, `🤖 *Вы успешно переключились на модель ${chosenModel}.*`, { parse_mode: 'Markdown' });
  });

  // Обработка текстовых сообщений для GPT
  bot.on('message', async (msg) => {
    const chatId = String(msg.chat.id);
    if (userState[chatId] !== 'gpt') return; // Проверяем состояние пользователя

    const userMessage = msg.text;
    if (!userMessage || userMessage.startsWith('/')) return;

    const userModel = userModels[chatId] || { modelName: 'GPT-3.5', endpoint: '/api/openai/model3.5' };

    let processingMessageId;

    try {
      const processingMessage = await bot.sendMessage(
        chatId,
        '⏳ *Обрабатываем ваш запрос...*',
        { parse_mode: 'Markdown' }
      );

      processingMessageId = processingMessage.message_id;

      const response = await axios.post(userModel.endpoint, {
        chatId,
        userMessage,
        modelName: userModel.modelName,
      });

      const botResponse = response.data.reply;

      await bot.deleteMessage(chatId, processingMessageId);

      if (botResponse.length <= 4000) {
        bot.sendMessage(chatId, `🤖 *Ответ:* \n${botResponse}`, { parse_mode: 'Markdown' });
      } else {
        const buffer = Buffer.from(botResponse, 'utf8');
        await bot.sendDocument(
          chatId,
          buffer,
          { caption: 'Ответ слишком большой, поэтому во вложении:' },
          { filename: 'reply.txt', contentType: 'text/plain' }
        );
      }

      // Сбрасываем состояние
      delete userModels[chatId];
      delete userState[chatId];
    } catch (error) {
      console.error('❌ Ошибка при обработке сообщения:', error);
      await bot.deleteMessage(chatId, processingMessageId);
      bot.sendMessage(chatId, '❌ *Произошла ошибка. Попробуйте позже.*', { parse_mode: 'Markdown' });
    }
  });
};




*/