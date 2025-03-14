const axios = require('../utils/axiosInstance');
require('dotenv').config();
const path = require('path');

const DEFAULT_MODEL = { modelName: 'GPT-4o-mini', endpoint: '/api/openai/model_gpt-4o-mini' };

const userModels = {};            // хранит выбранную модель (для GPT и изображений)
const userState = {};             // текущее состояние: 'gpt', 'numerologist' или 'image'
const userNumerologyChoices = {}; // выбор для нумеролога
const userNumerologyRes = {};     // подсказка для нумеролога
const userImageState = {};        // состояние для распознавания изображений (например, awaiting_image)

function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* function convertMarkdownCodeToHtml(text = '') {
  const codeBlockRegex = /```([\w-+]+)?([\s\S]*?)```/g;
  return text.replace(codeBlockRegex, (match, lang, code) => {
    code = code.trim();
    code = escapeHtml(code);
    if (lang) {
      return `<b>${escapeHtml(lang)}</b>\n<pre><code>${code}</code></pre>`;
    } else {
      return `<pre><code>${code}</code></pre>`;
    }
  });
} */

  function sanitizeBotResponse(responseText) {
    // Шаблон для поиска тройных кавычек и содержимого внутри
    const codeBlockRegex = /```([\s\S]*?)```/g;
    
    // Массив, в котором будет чередоваться: [текст вне кода, блок кода, текст вне кода, ...]
    let segments = [];
    let lastIndex = 0;
    
    // Находим все блоки "```...```"
    let match;
    while ((match = codeBlockRegex.exec(responseText)) !== null) {
      const index = match.index;
      // Добавить кусок текста до блока кода
      segments.push({
        type: 'text',
        content: responseText.slice(lastIndex, index),
      });
      // Добавить сам блок кода
      segments.push({
        type: 'code',
        content: match[1], // содержимое между ```
      });
      lastIndex = codeBlockRegex.lastIndex;
    }
    // Добавить оставшийся кусок текста после последнего блока
    if (lastIndex < responseText.length) {
      segments.push({
        type: 'text',
        content: responseText.slice(lastIndex),
      });
    }
    segments = segments.map((segment) => {
      if (segment.type === 'text') {
        // Экранируем весь текст (заменяем <, >, & и т.д.)
        return escapeHtml(segment.content);
      } else {
        // Это блок кода
        // 1. Тримим
        // 2. Тоже экранируем <, > и т.д.
        const codeContent = escapeHtml(segment.content.trim());
        // Оборачиваем в <pre><code>
        return `<pre><code>${codeContent}</code></pre>`;
      }
    });
  
    // Склеиваем всё обратно
    return segments.join('');
  }
  

/**
 * Формирует кнопку для выбора модели с индикатором, если модель уже выбрана.
 * @param {string} label - Текст кнопки.
 * @param {string} callbackId - Идентификатор модели.
 * @param {string} selectedModel - Выбранная модель.
 * @returns {object} - Объект кнопки для inline‑клавиатуры.
 */
function getModelButton(label, callbackId, selectedModel) {
  const text = callbackId === selectedModel ? `✅ ${label}` : label;
  return { text, callback_data: callbackId };
}

/**
 * Основное меню с тремя вариантами работы: GPT, нумеролог и распознавание изображений.
 */
function showMainMenu(bot, chatId, messageId) {
  return bot.editMessageText('Выберите режим работы:', {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: {
      inline_keyboard: [
        [{ text: '🤖 ChatGPT', callback_data: 'GPT_MAIN_CHOICE' }],
        [{ text: '🔮 Личный нумеролог', callback_data: 'NUMERO_MAIN_CHOICE' }],
        [{ text: '📸 Распознавание изображений', callback_data: 'IMAGE_MAIN_CHOICE' }],
      ],
    },
  });
}

/**
 * Меню выбора модели для обработки изображений.
 * Если модель уже выбрана, к её названию добавляется галочка.
 */
function showImageModelMenu(bot, chatId, messageId) {
  const currentImageModel = userModels[chatId] ? userModels[chatId].modelName : null;
  // Здесь используем понятное название для пользователя, а в callback_data передаём уникальный идентификатор
  const button = getModelButton('📸 Модель O1 (Анализ изображений)', 'IMAGE_MODEL_O1', currentImageModel);
  return bot.editMessageText('Выберите модель обработки изображений:', {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: {
      inline_keyboard: [
        [button],
        [{ text: '🔙 Назад', callback_data: 'BACK_MAIN_CHOICE' }],
      ],
    },
  });
}

module.exports = (bot) => {
  // Обработчик команды /model – выводит единое меню
  bot.onText(/\/model/, (msg) => {
    const chatId = String(msg.chat.id);
    // Сброс состояний
    userState[chatId] = null;
    userNumerologyChoices[chatId] = null;
    userNumerologyRes[chatId] = null;
    userImageState[chatId] = null;
    // Не сбрасываем выбранную модель, чтобы запоминалось и для изображений

    const options = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🤖 ChatGPT', callback_data: 'GPT_MAIN_CHOICE' }],
          [{ text: '🔮 Личный нумеролог', callback_data: 'NUMERO_MAIN_CHOICE' }],
          [{ text: '📸 Распознавание изображений', callback_data: 'IMAGE_MAIN_CHOICE' }],
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
      userImageState[chatId] = null;
      return showMainMenu(bot, chatId, messageId);
    }

    // Выбор режима работы
    if (data === 'GPT_MAIN_CHOICE') {
      userState[chatId] = 'gpt';
      const currentModel = userModels[chatId] ? userModels[chatId].modelName : DEFAULT_MODEL.modelName;
      return bot.editMessageText('Выберите модель GPT:', {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [
            [
              getModelButton('GPT-o3-mini', 'GPT-o3-mini', currentModel),
              getModelButton('GPT-4o-mini', 'GPT-4o-mini', currentModel),
            ],
            [
              getModelButton('GPT-4o', 'GPT-4o', currentModel),
              getModelButton('GPT-o1', 'GPT-o1', currentModel),
            ],
            [{ text: '🔙 Назад', callback_data: 'BACK_MAIN_CHOICE' }],
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
          message_id: messageId,
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

    if (data === 'IMAGE_MAIN_CHOICE') {
      userState[chatId] = 'image';
      // Не сбрасываем выбранную модель, если она уже была выбрана ранее
      // Показываем меню выбора моделей для изображений с галочкой, если модель уже выбрана
      return showImageModelMenu(bot, chatId, messageId);
    }

    // Обработка выбора GPT моделей
    if (userState[chatId] === 'gpt') {
      let endpoint;
      switch (data) {
        case 'GPT-o3-mini':
          endpoint = '/api/openai/o3-mini';
          break;
        case 'GPT-4o':
          endpoint = '/api/openai/model4';
          break;
        case 'GPT-4o-mini':
          endpoint = '/api/openai/model_gpt-4o-mini';
          break;
        case 'GPT-o1':
          endpoint = '/api/openaiO1/model_o1';
          break;
        default:
          return bot.answerCallbackQuery(callbackQuery.id, {
            text: 'Неизвестная модель.',
          });
      }
      userModels[chatId] = { modelName: data, endpoint };
      const keyboard = {
        inline_keyboard: [
          [
            getModelButton('GPT-o3-mini', 'GPT-o3-mini', data),
            getModelButton('GPT-4o-mini', 'GPT-4o-mini', data),
          ],
          [
            getModelButton('GPT-4o', 'GPT-4o', data),
            getModelButton('GPT-o1', 'GPT-o1', data),
          ],
          [{ text: '🔙 Назад', callback_data: 'BACK_MAIN_CHOICE' }],
        ],
      };
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: `Вы выбрали модель ${data}.`,
      });
      return bot.editMessageText(`Выберите модель GPT:\n\nВыбрана: ✅ ${data}`, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: keyboard,
      });
    }

    // Обработка выбора для нумеролога
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

    // Обработка выбора модели для изображений
    if (userState[chatId] === 'image') {
      if (data === 'IMAGE_MODEL_O1') {
        // Сохраняем выбранную модель для изображений как объект
        userModels[chatId] = { modelName: 'IMAGE_MODEL_O1', endpoint: '/api/imagebot/process-image' };
        userImageState[chatId] = 'awaiting_image';
        await bot.answerCallbackQuery(callbackQuery.id, { text: 'Вы выбрали Модель O1 (Анализ изображений). Теперь отправьте фото.' });
        return bot.sendMessage(chatId, '📤 *Отправьте фото, и я обработаю его!*', { parse_mode: 'Markdown' });
      }
    }
  });

  // Обработка текстовых сообщений
  bot.on('message', async (msg) => {
    const chatId = String(msg.chat.id);
    const userMessage = msg.text;

    // Если сообщение начинается с команды – пропускаем
    if (!userMessage || userMessage.startsWith('/')) {
      return;
    }

    // Если пользователь находится в режиме распознавания изображений и отправил текст,
    // напоминаем, что нужно отправить фото
    if (userState[chatId] === 'image' && !msg.photo) {
      return bot.sendMessage(chatId, 'Вы находитесь в режиме распознавания изображений. Пожалуйста, отправьте фото или нажмите "🔙 Назад" для смены режима.', { parse_mode: 'Markdown' });
    }

    // Обработка для нумеролога
    if (userState[chatId] === 'numerologist') {
      let processingMessageId;
      try {
        const processingMessage = await bot.sendMessage(
          chatId,
          '⏳ <b>Обрабатываем ваш запрос, пожалуйста, подождите...</b>',
          { parse_mode: 'HTML' }
        );
        processingMessageId = processingMessage.message_id;

        const response = await axios.post('/api/openai/numerologist', {
          chatId,
          type: userNumerologyChoices[chatId],
          userMessage,
        });

        if (processingMessageId) {
          try {
            await bot.deleteMessage(chatId, processingMessageId);
          } catch (err) {
            console.warn('⚠️ Не удалось удалить временное сообщение:', err.message);
          }
        }
        let botResponse = response.data.reply || 'Нет ответа...';
        botResponse = sanitizeBotResponse(botResponse);
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
            { caption: 'Ответ слишком большой, во вложении:' },
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

    // Обработка для GPT (чат) – если пользователь находится в режиме GPT
    if (userState[chatId] === 'gpt') {
      const userModel = userModels[chatId] || DEFAULT_MODEL;
      let processingMessageId;
      try {
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
        const response = await axios.post(userModel.endpoint, {
          chatId,
          userMessage,
          modelName: userModel.modelName,
        });
        if (processingMessageId) {
          try {
            await bot.deleteMessage(chatId, processingMessageId);
          } catch (err) {
            console.warn('⚠️ Не удалось удалить временное сообщение:', err.message);
          }
        }
        let botResponse = response.data.reply || 'Нет ответа...';
        botResponse = sanitizeBotResponse(botResponse);
        const byteLength = Buffer.byteLength(botResponse, 'utf-8');
        if (byteLength <= 4000) {
          bot.sendMessage(
            chatId,
            `<b>Ответ:</b>\n\n${botResponse}`,
            { parse_mode: 'HTML' }
          );
        } else {
          const buffer = Buffer.from(botResponse, 'utf8');
          await bot.sendDocument(
            chatId,
            buffer,
            { caption: 'Ответ слишком большой, во вложении:' },
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
    }
  });

  // Обработка фото для режима «Распознавание изображений»
bot.on('photo', async (msg) => {
  const chatId = String(msg.chat.id);
  // Если выбран режим изображений, обрабатываем каждое фото, независимо от userImageState
  if (userState[chatId] === 'image') {
    const fileId = msg.photo[msg.photo.length - 1].file_id;
    //console.log(`📸 Получен fileId: ${fileId}`);
    
    try {
      const file = await bot.getFile(fileId);
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        console.error('❌ Ошибка: BOT_TOKEN не загружен');
        return bot.sendMessage(chatId, '❌ Ошибка конфигурации бота.');
      }
      
      const fileUrl = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;
      //console.log(`🔗 Telegram File URL: ${fileUrl}`);

      // Скачиваем файл
      const response = await axios({
        method: 'get',
        url: fileUrl,
        responseType: 'arraybuffer'
      });
      const imageBuffer = Buffer.from(response.data, 'binary');

      // Определяем MIME‑тип на основе расширения файла
      const ext = path.extname(file.file_path).toLowerCase();
      let mimeType = 'image/jpeg'; // значение по умолчанию
      if (ext === '.png') {
        mimeType = 'image/png';
      } else if (ext === '.gif') {
        mimeType = 'image/gif';
      } else if (ext === '.webp') {
        mimeType = 'image/webp';
      }
      
      // Преобразуем изображение в строку Base64 с корректным MIME‑типом
      const base64Image = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
      
      let processingMessageId;
      try {
        const processingMessage = await bot.sendMessage(chatId, '⏳ *Обрабатываю изображение...*', { parse_mode: 'Markdown' });
        processingMessageId = processingMessage.message_id;
      } catch (err) {
        console.warn('⚠️ Ошибка отправки сообщения ожидания:', err);
      }
      
      //console.log(`🚀 Отправка на API с Base64`);
  
      // Отправляем изображение на API
      const apiResponse = await axios.post('/api/imagebot/process-image', {
        chatId,
        base64Image,
        userMessage: 'Что изображено на этом фото?',
      });
      
      if (processingMessageId) {
        await bot.deleteMessage(chatId, processingMessageId);
      }
      
      const botResponse = apiResponse.data.reply || 'Нет ответа...';
      bot.sendMessage(chatId, `📸 *Ответ:* \n\n${botResponse}`, { parse_mode: 'Markdown' });
      
      // Переустанавливаем состояние, чтобы можно было обрабатывать следующее фото
      userImageState[chatId] = 'awaiting_image';
      
    } catch (error) {
      console.error('❌ Ошибка при обработке фото:', error);
      bot.sendMessage(chatId, '❌ *Произошла ошибка при обработке фото, закончились запросы.*', { parse_mode: 'Markdown' });
    }
  }
});
};

