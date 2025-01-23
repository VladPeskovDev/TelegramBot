const axios = require('../utils/axiosInstance');
const userModels = {}; 
const DEFAULT_MODEL = { modelName: 'GPT-3.5 Turbo', endpoint: '/api/openai/model3.5' };
const userState = {};                 
const userNumerologyChoices = {};     
const userNumerologyRes = {};         

function showMainMenu(bot, chatId, messageId) {
  return bot.editMessageText('Выберите режим работы:', {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: {
      inline_keyboard: [
        [{ text: '🤖 GPT', callback_data: 'GPT_MAIN_CHOICE' }],
        [{ text: '🔮 Личный нумеролог', callback_data: 'NUMERO_MAIN_CHOICE' }],
      ],
    },
  });
}

module.exports = (bot) => {
  bot.onText(/\/model/, (msg) => {
    const chatId = String(msg.chat.id);

    userState[chatId] = null;
    userNumerologyChoices[chatId] = null;
    userNumerologyRes[chatId] = null;

    const options = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🤖 ChatGPT', callback_data: 'GPT_MAIN_CHOICE' }],
          [{ text: '🔮 Личный нумеролог', callback_data: 'NUMERO_MAIN_CHOICE' }],
        ],
      },
    };

    bot.sendMessage(chatId, 'Выберите режим работы:', options);
  });

  // 2. Обработка callback_query при выборе /model
  
  bot.on('callback_query', async (callbackQuery) => {
    const chatId = String(callbackQuery.message.chat.id);
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data;

    if (data === 'BACK_MAIN_CHOICE') {
      userState[chatId] = null;
      return showMainMenu(bot, chatId, messageId);
    }

    if (data === 'GPT_MAIN_CHOICE') {
      userState[chatId] = 'gpt';
      return bot.editMessageText('Выберите модель GPT:', {
        chat_id: chatId,
        message_id: callbackQuery.message.message_id,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🤖 GPT-3.5 Turbo', callback_data: 'GPT-3.5 Turbo' },
              { text: '⚡ GPT-4o-mini', callback_data: 'GPT-4o-mini' },
            ],
            [
              { text: '🧠 GPT-4o', callback_data: 'GPT-4o' },
              { text: '🆕 GPT-o1-mini', callback_data: 'GPT-o1-mini' },
            ],
            [
              { text: '🔙 Назад', callback_data: 'BACK_MAIN_CHOICE' },
            ],
          ],
        },
      });
    }

    if (data === 'NUMERO_MAIN_CHOICE') {
      userState[chatId] = 'numerologist';
      userModels[chatId] = null;
      //console.log(`User ${chatId} switched to numerologist. GPT model reset.`); 

      return bot.editMessageText(
        '🔮 *Вы переключились на модель "Личный нумеролог".* \n\nВыберите один из типов разбора:',
        {
          chat_id: chatId,
          message_id: callbackQuery.message.message_id,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { 
                  text: '🗺️ Нумерологическая карта', 
                  callback_data: 'numerology_map' 
                },
              ],
              [
                { 
                  text: '🎲 Нумерологический расклад', 
                  callback_data: 'numerology_spread' 
                },
              ],
              [
                { 
                  text: '🪞 Нумерологический портрет', 
                  callback_data: 'numerology_portrait' 
                },
              ],
              [
                { 
                  text: '🌀 Матрица Пифагора', 
                  callback_data: 'numerology_pythagoras' 
                },
              ],
              [
                { text: '🔙 Назад', 
                  callback_data: 'BACK_MAIN_CHOICE' },
              ],
            ],
          },
        }
      );
    }

    if (userState[chatId] === 'gpt') {
      let endpoint;
      switch (data) {
        case 'GPT-3.5 Turbo':
          endpoint = '/api/openai/model3.5';
          break;
        case 'GPT-4o':
          endpoint = '/api/openai/model4';
          break;
        case 'GPT-4o-mini':
          endpoint = '/api/openai/model_gpt-4o-mini';
          break;
        case 'GPT-o1-mini':
          endpoint = '/api/openaiO1/model_o1-mini-2024-09-12';
          break;
        default:
          return bot.answerCallbackQuery(callbackQuery.id, {
            text: 'Неизвестная модель.',
          });
      }

      userModels[chatId] = { modelName: data, endpoint };
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: `Вы выбрали модель ${data}.`,
      });

      return bot.sendMessage(
        chatId,
        `Вы успешно переключились на модель ${data}.`
      );
    }

    if (userState[chatId] === 'numerologist') {
      let choiceText = '';
      let resText = '';

      switch (data) {
        case 'numerology_map':
          choiceText = 'Нумерологическая карта — полный и глубокий анализ личности, включая числа Жизненного Пути, Судьбы, Личности, Сердца и др.';
          resText = 'Теперь отправьте ваш запрос. В формате: *Фамилия Имя Отчество* и полная дата рождения.';
          break;
        case 'numerology_spread':
          choiceText = 'Нумерологический расклад — глубокий анализ конкретной темы или вопроса (финансы, отношения, здоровье, карьера).';
          resText = 'Теперь отправьте ваш запрос. В формате: *Фамилия Имя Отчество* и полная дата рождения, а также укажите тему/вопрос.';
          break;
        case 'numerology_portrait':
          choiceText = 'Нумерологический портрет — краткий и поверхностный анализ личности.';
          resText = 'Теперь отправьте ваш запрос. В формате: *Фамилия Имя Отчество* и полная дата рождения.';
          break;
        case 'numerology_pythagoras':
          choiceText = 'Матрица Пифагора (психоматрица) – это специфический метод нумерологии, анализирующий черты характера и способности человека на основе даты рождения';
          resText = 'Теперь отправьте ваш запрос. В формате: *Фамилия Имя Отчество* и полная дата рождения.';
          break;
        default:
          return bot.answerCallbackQuery(callbackQuery.id, {
            text: '❌ Неизвестный выбор.',
          });
      }

      userNumerologyChoices[chatId] = choiceText;
      userNumerologyRes[chatId] = resText;

      await bot.answerCallbackQuery(callbackQuery.id, {
        text: `✅ Вы выбрали: ${choiceText}`,
      });

      return bot.sendMessage(
        chatId,
        `🔮 *${choiceText}*\n\n${resText}`,
        { parse_mode: 'Markdown' }
      );
    }
  });

 
  bot.on('message', async (msg) => {
    const chatId = String(msg.chat.id);
    const userMessage = msg.text;

    if (!userMessage || userMessage.startsWith('/')) {
      return;
    }

    if (userState[chatId] === 'numerologist') {
      try {
        const response = await axios.post('/api/openai/numerologist', {
          chatId,
          type: userNumerologyChoices[chatId], 
          userMessage,
        });

        const botResponse = response.data.reply || 'Нет ответа...';

        if (botResponse.length <= 4000) {
          const formattedResponse = botResponse.includes('```')
            ? botResponse
            : `\`\`\`\n${botResponse}\n\`\`\``; // Обрамляем ответ в блок кода, если код не выделен
        
          bot.sendMessage(chatId, `🤖 *Ответ:* \n${formattedResponse}`, {
            parse_mode: 'MarkdownV2',
          });
        } else {
          const buffer = Buffer.from(botResponse, 'utf8');
          await bot.sendDocument(
            chatId,
            buffer,
            {
              caption: 'Ответ слишком большой, поэтому во вложении:',
              parse_mode: 'Markdown',
            },
            { filename: 'reply.txt', contentType: 'text/plain' }
          );
        }
        
      } catch (error) {
        console.error('❌ Ошибка при обработке сообщения (нумерология):', error);
        return bot.sendMessage(
          chatId,
          '❌ *Произошла ошибка при нумерологическом запросе, возможно истекли запросы.*',
          { parse_mode: 'Markdown' }
        );
      } finally {
        userState[chatId] = null;
        delete userNumerologyChoices[chatId];
        delete userNumerologyRes[chatId];
      }
      return 
    }

    const userModel = userModels[chatId] || DEFAULT_MODEL;
    if (!userModel) {
    return; 
  }
    let processingMessageId;
    try {
      const processingMessage = await bot.sendMessage(
        chatId,
        '⏳ *Обрабатываем ваш запрос, пожалуйста, подождите...*',
        { parse_mode: 'Markdown' }
      );
      processingMessageId = processingMessage.message_id;
    } catch (err) {
      console.warn('⚠️ Не удалось отправить сообщение о начале обработки:', err);
    }

    try {
      const response = await axios.post(userModel.endpoint, {
        chatId,
        userMessage,
        modelName: userModel.modelName,
      });

      const botResponse = response.data.reply;

      if (processingMessageId) {
        try {
          await bot.deleteMessage(chatId, processingMessageId);
        } catch (err) {
          console.warn('⚠️ Не удалось удалить временное сообщение:', err.message);
        }
      }

      if (botResponse.length <= 4000) {
        bot.sendMessage(chatId, `🤖 *Ответ:* \n${botResponse}`, {
          parse_mode: 'Markdown',
        });
      } else {
        const buffer = Buffer.from(botResponse, 'utf8');
        await bot.sendDocument(
          chatId,
          buffer,
          {
            caption: 'Ответ слишком большой, поэтому во вложении:',
            parse_mode: 'Markdown',
          },
          { filename: 'reply.txt', contentType: 'text/plain' }
        );
      }
    } catch (error) {
      console.error('❌ Ошибка при обработке GPT-сообщения:', error);

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


