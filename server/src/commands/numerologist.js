const axios = require('../utils/axiosInstance');
const { userState, userNumerologyChoices, userNumerologyRes } = require('./userState');

module.exports = (bot) => {
  bot.onText(/\/numerologist/, (msg) => {
    const chatId = String(msg.chat.id);
    userState[chatId] = 'numerologist';

    const options = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📊 Нумерологическая карта', callback_data: 'numerology_map' }],
          [{ text: '🔍 Нумерологический расклад', callback_data: 'numerology_spread' }],
          [{ text: '🧠 Нумерологический портрет', callback_data: 'numerology_portrait' }],
          [{ text: '🌀 Матрица Пифагора', callback_data: 'numerology_pythagoras' }],
        ],
      },
    };

    bot.sendMessage(
      chatId,
      '🔮 *Вы переключились на модель "Личный нумеролог".* \n\nВыберите один из типов разбора:',
      { parse_mode: 'Markdown', ...options }
    );
  });

  bot.on('callback_query', async (callbackQuery) => {
    const chatId = String(callbackQuery.message.chat.id);
    
    if (userState[chatId] !== 'numerologist') return;
    const choice = callbackQuery.data;

    switch (choice) {
        case 'numerology_map':
          userNumerologyChoices[chatId] = 'Нумерологическая карта — полный и глубокий анализ личности, включающий числа Жизненного Пути, Судьбы, Личности, Сердца и др.';
          userNumerologyRes[chatId] = 'Теперь отправьте ваш запрос. В формате Фамилия Имя Отчество и полная дата рождения.';
          break;
        case 'numerology_spread':
          userNumerologyChoices[chatId] = 'Нумерологический расклад — глубокий анализ конкретной темы или вопроса (финансы, отношения, здоровье, карьера).';
          userNumerologyRes[chatId] = 'Теперь отправьте ваш запрос. В формате Фамилия Имя Отчество и полная дата рождения, а также добавьте уточнение для анализа конкретной темы или вопроса (финансы, отношения, здоровье, карьера).';
          break;
        case 'numerology_portrait':
          userNumerologyChoices[chatId] = 'Нумерологический портрет — краткий и поверхностный анализ личности';
          userNumerologyRes[chatId] = 'Теперь отправьте ваш запрос. В формате Фамилия Имя Отчество и полная дата рождения.';
          break;
        case 'numerology_pythagoras':
          userNumerologyChoices[chatId] = 'Матрица Пифагора — специфический метод нумерологии, основанный на квадрате Пифагора, строится исключительно на дате рождения (без имени)';
          userNumerologyRes[chatId] = 'Теперь отправьте ваш запрос. В формате Фамилия Имя Отчество и полная дата рождения.';
          break;
        default:
          bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Неизвестный выбор.' });
          return;
      }
  
      bot.answerCallbackQuery(callbackQuery.id, { text: `✅ Вы выбрали: ${userNumerologyChoices[chatId]}` });
      bot.sendMessage(
        chatId,
        `🔮 *${userNumerologyChoices[chatId]}*\n\n${userNumerologyRes[chatId]}`,
        { parse_mode: 'Markdown' }
      );
    });

  bot.on('message', async (msg) => {
    const chatId = String(msg.chat.id);

    if (!msg.text || msg.text.startsWith('/')) {
    return; 
  }

    if (userState[chatId] !== 'numerologist') return;

    const userMessage = msg.text;

    try {
      const response = await axios.post('/api/openai/numerologist', {
        chatId,
        type: userNumerologyChoices[chatId],
        userMessage,
      });

      bot.sendMessage(chatId, `🔮 *Ответ:* \n${response.data.reply}`, { parse_mode: 'Markdown' });

      delete userNumerologyChoices[chatId];
      delete userState[chatId];
    } catch (error) {
      console.error('❌ Ошибка при обработке сообщения:', error);
      bot.sendMessage(chatId, '❌ *Ошибка обработки.*', { parse_mode: 'Markdown' });
    }
  });
};











/* const axios = require('../utils/axiosInstance');

// Храним текущие модели пользователей и выбранные разборы
const userModels = {};
const userNumerologyChoices = {};

module.exports = (bot) => {
  
  bot.onText(/\/numerologist/, (msg) => {
    const chatId = String(msg.chat.id);

    // Устанавливаем модель "Личный нумеролог"
    userModels[chatId] = {
      modelName: 'Personal Numerologist',
      endpoint: '/api/openai/numerologist',
    };

    // Отображаем меню с выбором разбора
    const options = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📊 Нумерологическая карта', callback_data: 'numerology_map' }],
          [{ text: '🔍 Нумерологический расклад', callback_data: 'numerology_spread' }],
          [{ text: '🧠 Нумерологический портрет', callback_data: 'numerology_portrait' }],
          [{ text: '🌀 Матрица Пифагора', callback_data: 'numerology_pythagoras' }],
        ],
      },
    };

    bot.sendMessage(
      chatId,
      '🔮 *Вы переключились на модель "Личный нумеролог".* \n\nВыберите один из типов разбора:',
      { parse_mode: 'Markdown', ...options }
    );
  });

  
  bot.on('callback_query', async (callbackQuery) => {
    const chatId = String(callbackQuery.message.chat.id);
    const choice = callbackQuery.data;

    switch (choice) {
      case 'numerology_map':
        userNumerologyChoices[chatId] = 'Нумерологическая карта — полный и глубокий анализ личности, включающий числа Жизненного Пути, Судьбы, Личности, Сердца и др.';
        break;
      case 'numerology_spread':
        userNumerologyChoices[chatId] = 'Нумерологический расклад — глубокий анализ конкретной темы или вопроса (финансы, отношения, здоровье, карьера).';
        break;
      case 'numerology_portrait':
        userNumerologyChoices[chatId] = 'Нумерологический портрет — краткий и поверхностный анализ личности';
        break;
      case 'numerology_pythagoras':
        userNumerologyChoices[chatId] = 'Матрица Пифагора — специфический метод нумерологии, основанный на квадрате Пифагора, строится исключительно на дате рождения (без имени)';
        break;
      default:
        bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Неизвестный выбор.' });
        return;
    }

    bot.answerCallbackQuery(callbackQuery.id, { text: `✅ Вы выбрали: ${userNumerologyChoices[chatId]}` });
    bot.sendMessage(
      chatId,
      `🔮 *${userNumerologyChoices[chatId]}*\n\nТеперь отправьте ваш запрос. В формате Фамилия Имя Отчество и полная дата рождения.`,
      { parse_mode: 'Markdown' }
    );
  });

 
  bot.on('message', async (msg) => {
    const chatId = String(msg.chat.id);
    const userMessage = msg.text;

    // Игнорируем команды и пустые сообщения
    if (!userMessage || userMessage.startsWith('/')) {
      return;
    }

    // Проверяем, выбран ли тип разбора
    const numerologyChoice = userNumerologyChoices[chatId];
    if (!numerologyChoice) {
      bot.sendMessage(
        chatId,
        '⚠️ *Пожалуйста, сначала выберите тип нумерологического разбора.*\n\nИспользуйте команду /numerologist для выбора.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Определяем текущую модель пользователя
    const userModel = userModels[chatId] || {
      modelName: 'GPT-3.5',
      endpoint: '/api/openai/model3.5',
    };

    let processingMessageId;

    try {
      // ⏳ Отправляем временное сообщение
      const processingMessage = await bot.sendMessage(
        chatId,
        '⏳ *Обрабатываем ваш запрос, пожалуйста, подождите...*',
        { parse_mode: 'Markdown' }
      );

      processingMessageId = processingMessage.message_id;

      // 📤 Запрашиваем ответ у API OpenAI
      const response = await axios.post(userModel.endpoint, {
        chatId,
        userMessage: `${numerologyChoice}\nВопрос: ${userMessage}`,
        modelName: userModel.modelName,
      });

      const botResponse = response.data.reply;

      // ✅ Удаляем временное сообщение
      try {
        await bot.deleteMessage(chatId, processingMessageId);
      } catch (err) {
        console.warn('⚠️ Не удалось удалить временное сообщение:', err.message);
      }

      // 📩 Отправляем ответ
      if (botResponse.length <= 4000) {
        bot.sendMessage(
          chatId,
          `🔮 *Ответ нумеролога:* \n${botResponse}`,
          { parse_mode: 'Markdown' }
        );
      } else {
        // Ответ слишком длинный – отправляем в виде txt-файла
        const buffer = Buffer.from(botResponse, 'utf8');

        await bot.sendDocument(
          chatId,
          buffer,
          { caption: '🔮 Ответ слишком большой, поэтому во вложении:' },
          { filename: 'numerologist_reply.txt', contentType: 'text/plain' }
        );
      }

      // Очищаем выбор после ответа
      delete userNumerologyChoices[chatId];
    } catch (error) {
      console.error('❌ Ошибка при обработке сообщения:', error);

      // ❗ Удаляем временное сообщение в случае ошибки
      if (processingMessageId) {
        try {
          await bot.deleteMessage(chatId, processingMessageId);
        } catch (delErr) {
          console.warn('⚠️ Не удалось удалить временное сообщение:', delErr.message);
        }
      }

      const errorMessage =
        error.response?.data?.error || '❌ *Произошла ошибка. Попробуйте позже.*';

      bot.sendMessage(chatId, errorMessage, { parse_mode: 'Markdown' });
    }
  });
};
*/