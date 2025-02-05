const axios = require('../utils/axiosInstance');
const userModels = {};
const DEFAULT_MODEL = { modelName: 'GPT-3.5 Turbo', endpoint: '/api/openai/model3.5' };
const userState = {};
const userNumerologyChoices = {};
const userNumerologyRes = {};

function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function convertMarkdownCodeToHtml(text = '') {
  const codeBlockRegex = /```([\w-+]+)?([\s\S]*?)```/g;

  return text.replace(codeBlockRegex, (match, lang, code) => {
    code = code.trim();
    code = escapeHtml(code);

    if (lang) {
      return `<pre><code class="language-${lang}">${code}</code></pre>`;
    } else {
      return `<pre><code>${code}</code></pre>`;
    }
  });
}

/**
 * Функция для формирования кнопки выбора модели с индикатором (галочкой),
 * если модель уже выбрана.
 * @param {string} modelName - Название модели.
 * @param {string} selectedModel - Название выбранной модели.
 * @returns {object} - Объект кнопки для inline‑клавиатуры.
 */
function getModelButton(modelName, selectedModel) {
  const text = modelName === selectedModel ? `✅ ${modelName}` : modelName;
  return { text, callback_data: modelName };
}

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
      // Если пользователь уже выбирал модель, берём её название, иначе дефолтное
      const currentModel = userModels[chatId] ? userModels[chatId].modelName : DEFAULT_MODEL.modelName;
      return bot.editMessageText('Выберите модель GPT:', {
        chat_id: chatId,
        message_id: callbackQuery.message.message_id,
        reply_markup: {
          inline_keyboard: [
            [
              getModelButton('GPT-3.5 Turbo', currentModel),
              getModelButton('GPT-4o-mini', currentModel),
            ],
            [
              getModelButton('GPT-4o', currentModel),
              getModelButton('GPT-o1-mini', currentModel),
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

      return bot.editMessageText(
        '<b>Вы переключились на модель «Личный нумеролог».</b>\n\nВыберите один из типов разбора:',
        {
          chat_id: chatId,
          message_id: callbackQuery.message.message_id,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🗺️ Нумерологическая карта', callback_data: 'numerology_map' }],
              [{ text: '🎲 Нумерологический расклад', callback_data: 'numerology_spread' }],
              [{ text: '🪞 Нумерологический портрет', callback_data: 'numerology_portrait' }],
              [{ text: '🌀 Матрица Пифагора', callback_data: 'numerology_pythagoras' }],
              [{ text: '🔙 Назад', callback_data: 'BACK_MAIN_CHOICE' }],
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

      // Формируем обновлённую клавиатуру с отметкой выбранной модели
      const keyboard = {
        inline_keyboard: [
          [
            getModelButton('GPT-3.5 Turbo', data),
            getModelButton('GPT-4o-mini', data),
          ],
          [
            getModelButton('GPT-4o', data),
            getModelButton('GPT-o1-mini', data),
          ],
          [
            { text: '🔙 Назад', callback_data: 'BACK_MAIN_CHOICE' },
          ],
        ],
      };

      await bot.answerCallbackQuery(callbackQuery.id, {
        text: `Вы выбрали модель ${data}.`,
      });

      return bot.editMessageText(`Выберите модель GPT:\n\nВыбрана: ✅ ${data}`, {
        chat_id: chatId,
        message_id: callbackQuery.message.message_id,
        reply_markup: keyboard,
      });
    }

    if (userState[chatId] === 'numerologist') {
      let choiceText = '';
      let resText = '';

      switch (data) {
        case 'numerology_map':
          choiceText = 'Нумерологическая карта — полный анализ личности (числа Жизненного Пути, Судьбы, Личности и т.д.).';
          resText = 'Отправьте запрос в формате: <b>Фамилия Имя Отчество</b> и <b>дата рождения</b>.';
          break;
        case 'numerology_spread':
          choiceText = 'Нумерологический расклад — анализ конкретной темы (финансы, отношения, здоровье, карьера и т.д.).';
          resText = 'Отправьте запрос: <b>ФИО</b>, <b>дата рождения</b> и укажите тему/вопрос.';
          break;
        case 'numerology_portrait':
          choiceText = 'Нумерологический портрет — краткий анализ личности.';
          resText = 'Отправьте запрос в формате: <b>ФИО</b> и <b>дата рождения</b>.';
          break;
        case 'numerology_pythagoras':
          choiceText = 'Матрица Пифагора — метод нумерологии для анализа характера по дате рождения.';
          resText = 'Отправьте запрос в формате: <b>ФИО</b> и <b>дата рождения</b>.';
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
        `🔮 <b>${choiceText}</b>\n\n${resText}`,
        { parse_mode: 'HTML' }
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
      let processingMessageId;

      try {
        // Отправляем «временное» сообщение, сохраняем его message_id
        const processingMessage = await bot.sendMessage(
          chatId,
          '⏳ <b>Обрабатываем ваш запрос, пожалуйста, подождите...</b>',
          { parse_mode: 'HTML' }
        );
        processingMessageId = processingMessage.message_id;

        // Делаем запрос к эндпоинту нумеролога
        const response = await axios.post('/api/openai/numerologist', {
          chatId,
          type: userNumerologyChoices[chatId],
          userMessage,
        });

        // Удаляем временное сообщение
        if (processingMessageId) {
          try {
            await bot.deleteMessage(chatId, processingMessageId);
          } catch (err) {
            console.warn('⚠️ Не удалось удалить временное сообщение:', err.message);
          }
        }

        let botResponse = response.data.reply || 'Нет ответа...';

        botResponse = convertMarkdownCodeToHtml(botResponse);

        if (botResponse.length <= 4000) {
          bot.sendMessage(
            chatId,
            `🤖 <b>Ответ:</b>\n\n${botResponse}`,
            { parse_mode: 'HTML' }
          );
        } else {
          const buffer = Buffer.from(botResponse, 'utf8');
          await bot.sendDocument(
            chatId,
            buffer,
            {
              caption: 'Ответ слишком большой, во вложении:',
            },
            { filename: 'reply.txt', contentType: 'text/plain' }
          );
        }

      } catch (error) {
        console.error('❌ Ошибка при нумерологическом запросе:', error);
        return bot.sendMessage(
          chatId,
          '❌ <b>Произошла ошибка при нумерологическом запросе.</b>',
          { parse_mode: 'HTML' }
        );
      } finally {
        userState[chatId] = null;
        delete userNumerologyChoices[chatId];
        delete userNumerologyRes[chatId];
      }
      return;
    }

    const userModel = userModels[chatId] || DEFAULT_MODEL;
    
    let processingMessageId;
    try {
      // Отправляем сообщение ожидания
      const processingMessage = await bot.sendMessage(
        chatId,
        '⏳ <b>Обрабатываем ваш запрос, пожалуйста, подождите...</b>',
        { parse_mode: 'HTML' }
      );
      processingMessageId = processingMessage.message_id;
    } catch (err) {
      console.warn('⚠️ Не удалось отправить сообщение о начале обработки:', err);
    }

    try {
      // Запрашиваем ответ от выбранной модели (или модели по умолчанию)
      const response = await axios.post(userModel.endpoint, {
        chatId,
        userMessage,
        modelName: userModel.modelName,
      });

      // Удаляем сообщение ожидания, если оно есть
      if (processingMessageId) {
        try {
          await bot.deleteMessage(chatId, processingMessageId);
        } catch (err) {
          console.warn('⚠️ Не удалось удалить временное сообщение:', err.message);
        }
      }

      let botResponse = response.data.reply || 'Нет ответа...';

      botResponse = convertMarkdownCodeToHtml(botResponse);

      if (botResponse.length <= 4000) {
        bot.sendMessage(
          chatId,
          `🤖 <b>Ответ:</b>\n\n${botResponse}`,
          { parse_mode: 'HTML' }
        );
      } else {
        const buffer = Buffer.from(botResponse, 'utf8');
        await bot.sendDocument(
          chatId,
          buffer,
          {
            caption: 'Ответ слишком большой, во вложении:',
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
          console.warn('⚠️ Не удалось удалить временное сообщение:', delErr.message);
        }
      }

      const errorMessage = error.response?.data?.error || '❌ <b>Произошла ошибка. Попробуйте позже.</b>';

      bot.sendMessage(chatId, errorMessage, { parse_mode: 'HTML' });
    }
  });
};





/* const axios = require('../utils/axiosInstance');
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
*/
