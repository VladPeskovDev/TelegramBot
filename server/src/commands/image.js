const axios = require('../utils/axiosInstance');
require('dotenv').config();
//const fs = require('fs');

const userModels = {}; // Храним выбранную модель пользователя
const userImageState = {}; // Следим за состоянием (ожидает ли бот фото)

/**
 * Отправляет клавиатуру с выбором модели для обработки изображений.
 */
function showImageModelMenu(bot, chatId) {
  const options = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📸 Модель O1 (Анализ изображений)', callback_data: 'IMAGE_MODEL_O1' }],
        [{ text: '🔙 Назад', callback_data: 'BACK_MAIN_CHOICE' }],
      ],
    },
  };
  bot.sendMessage(chatId, 'Выберите модель обработки изображений:', options);
}

module.exports = (bot) => {
  bot.onText(/\/image/, async (msg) => {
    const chatId = String(msg.chat.id);
    userImageState[chatId] = null;

    const options = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📸 Выбрать модель', callback_data: 'CHOOSE_IMAGE_MODEL' }],
        ],
      },
    };

    bot.sendMessage(
      chatId,
      '📸 *Этот бот умеет анализировать изображения!* \n\n' +
        'Вы можете загрузить фото, и бот расскажет, что на нём изображено.',
      { parse_mode: 'Markdown', ...options }
    );
  });

  bot.on('callback_query', async (callbackQuery) => {
    const chatId = String(callbackQuery.message.chat.id);
    const data = callbackQuery.data;

    if (data === 'CHOOSE_IMAGE_MODEL') {
      return showImageModelMenu(bot, chatId);
    }

    if (data === 'IMAGE_MODEL_O1') {
      userModels[chatId] = 'o1';
      userImageState[chatId] = 'awaiting_image';

      await bot.answerCallbackQuery(callbackQuery.id, { text: 'Вы выбрали O1. Теперь отправьте фото.' });
      return bot.sendMessage(chatId, '📤 *Отправьте фото, и я обработаю его!*', { parse_mode: 'Markdown' });
    }
  });

  bot.on('photo', async (msg) => {
    const chatId = String(msg.chat.id);

    if (userImageState[chatId] !== 'awaiting_image') {
        return;
    }

    userImageState[chatId] = null;

    const fileId = msg.photo[msg.photo.length - 1].file_id;
    console.log(`📸 Получен fileId: ${fileId}`);

    try {
        const file = await bot.getFile(fileId);
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
            console.error('❌ Ошибка: BOT_TOKEN не загружен');
            return bot.sendMessage(chatId, '❌ Ошибка конфигурации бота.');
        }

        const fileUrl = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;
        console.log(`🔗 Telegram File URL: ${fileUrl}`);

        // **Скачиваем файл**
        const response = await axios({
            method: 'get',
            url: fileUrl,
            responseType: 'arraybuffer'
        });

        const imageBuffer = Buffer.from(response.data, 'binary');

        // **Конвертируем в Base64**
        const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
        console.log(`✅ Изображение сконвертировано в Base64 (длина: ${base64Image.length})`);

        let processingMessageId;
        try {
            const processingMessage = await bot.sendMessage(chatId, '⏳ *Обрабатываю изображение...*', { parse_mode: 'Markdown' });
            processingMessageId = processingMessage.message_id;
        } catch (err) {
            console.warn('⚠️ Ошибка отправки сообщения ожидания:', err);
        }

        console.log(`🚀 Отправка на API с Base64`);

        // **Отправляем на API наш Base64**
        const apiResponse = await axios.post('/api/imagebot/process-image', {
            chatId,
            base64Image,
            userMessage: 'Что изображено на этом фото?',
        });

        console.log(`✅ Ответ API:`, apiResponse.data);

        if (processingMessageId) {
            await bot.deleteMessage(chatId, processingMessageId);
        }

        const botResponse = apiResponse.data.reply || 'Нет ответа...';
        bot.sendMessage(chatId, `📸 *Ответ:* \n\n${botResponse}`, { parse_mode: 'Markdown' });

    } catch (error) {
        console.error('❌ Ошибка при обработке фото:', error);
        bot.sendMessage(chatId, '❌ *Произошла ошибка при обработке фото.*', { parse_mode: 'Markdown' });
    }
});
};
