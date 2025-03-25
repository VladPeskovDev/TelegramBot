const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const {
  User,
  UserSubscription,
  Subscription,
  SubscriptionModelLimit,
  UserModelRequest,
} = require('../../db/models');
const cache = require('../utils/cacheRedis');
const openai = require('../utils/openai');
const userRateLimiter = require('../utils/rateLimitConfig');

const audioBotRouter = express.Router();



audioBotRouter.route('/process-audio').post(userRateLimiter, async (req, res) => {
  console.log('✅ Получен запрос на обработку аудио.');

  const { chatId, base64Audio } = req.body;

  if (!chatId || !base64Audio) {
    console.error('❌ Ошибка: отсутствуют обязательные параметры (chatId, base64Audio).');
    return res.status(400).json({ error: 'Отсутствуют обязательные параметры (chatId, base64Audio).' });
  }

  const tempAudioFilePath = path.join(__dirname, '../../uploads/temp_audio.wav');
  const mainKey = `user_${chatId}_audioProcess_model6`;
  const triggerKey = `trigger_${chatId}_audioProcess_model6`;
  const contextKey = `audio_context_${chatId}`;

  try {
    // 🔄 Декодируем Base64 и сохраняем как WAV-файл
    console.log('📥 Декодируем Base64 и сохраняем файл...');
    const audioBuffer = Buffer.from(base64Audio, 'base64');
    fs.writeFileSync(tempAudioFilePath, audioBuffer);

    // 🟢 Получаем контекст диалога пользователя (если он есть)
    let cachedContext = (await cache.getCache(contextKey)) || [];

    // 🟢 Проверяем подписку и лимиты пользователя
    let userCache = await cache.getCache(mainKey);
    if (!userCache) {
      console.log('📡 Запрос информации о пользователе...');
      const user = await User.findOne({ where: { telegram_id: chatId } });
      if (!user) {
        return res.status(403).json({ error: 'Пользователь не зарегистрирован в боте. Используйте /start в Telegram.' });
      }

      const activeSubscription = await UserSubscription.findOne({
        where: { user_id: user.id },
        include: [{ model: Subscription, as: 'subscription' }],
        order: [['end_date', 'DESC']],
      });

      if (!activeSubscription || new Date(activeSubscription.end_date) < new Date()) {
        return res.status(403).json({ error: 'У вас нет активной подписки. Пожалуйста, оформите подписку.' });
      }

      // Проверяем лимит подписки
      const subscriptionLimit = await SubscriptionModelLimit.findOne({
        where: { subscription_id: activeSubscription.subscription.id, model_id: 6 },
      });

      if (!subscriptionLimit) {
        return res.status(400).json({ error: 'Лимиты для данной подписки и модели не найдены.' });
      }

      // Проверяем, сколько запросов уже использовано
      const userModelRequest = await UserModelRequest.findOne({
        where: { user_id: user.id, model_id: 6 },
      });

      const currentRequestCount = userModelRequest ? userModelRequest.request_count : 0;

      userCache = {
        userId: user.id,
        requestsLimit: subscriptionLimit.requests_limit,
        requestCount: currentRequestCount,
        syncing: false,
        modelId: 6,
      };

      await cache.setCache(mainKey, userCache, 600);
    }

    // 🟢 Проверяем, не превышен ли лимит запросов
    if (userCache.requestCount >= userCache.requestsLimit) {
      return res.status(403).json({ error: 'Вы исчерпали лимит запросов. Оформите подписку (/subscription).' });
    }

    // ✅ Увеличиваем счётчик запросов
    userCache.requestCount += 1;

    // Принудительное обновление счётчика в БД каждые 5 запросов
    if (userCache.requestCount % 5 === 0 && !userCache.syncing) {
      userCache.syncing = true;
      await UserModelRequest.upsert(
        {
          user_id: userCache.userId,
          model_id: userCache.modelId,
          request_count: userCache.requestCount,
        },
        { where: { user_id: userCache.userId, model_id: userCache.modelId } },
      );
      userCache.syncing = false;
    }

    // ✅ Обновляем кеш
    await cache.setCache(mainKey, userCache, 450);
    await cache.setCache(triggerKey, '1', 448);

    // **Отправляем аудио в Whisper API**
    console.log('🎙 Отправка аудио в Whisper API...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(tempAudioFilePath));
    formData.append('model', 'whisper-1');
    formData.append('language', 'ru');

    const whisperResponse = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders(),
      },
    });

    const transcribedText = whisperResponse.data.text.trim();
    console.log('📝 Распознанный текст:', transcribedText);

    // Удаляем временный файл после обработки
    fs.unlinkSync(tempAudioFilePath);

    // 📌 **Формируем контекст для GPT-4o**
    cachedContext.push({
      role: 'user',
      content: [{ type: 'text', text: transcribedText }],
    });

    if (cachedContext.length > 0) {
      cachedContext = cachedContext.slice(-0);
    }

    console.log('🤖 Отправка запроса в GPT...');
    const gptResponse = await openai.chat.completions.create({
      model: 'gpt-4o-2024-11-20',
      messages: cachedContext,
      max_tokens: 1300,
      temperature: 0.7,
    });

    const botResponse = gptResponse.choices?.[0]?.message?.content?.trim() || 'Ответ пустой';

    // Сохраняем контекст
    cachedContext.push({ role: 'assistant', content: botResponse });
    if (cachedContext.length > 0) {
      cachedContext = cachedContext.slice(-0);
    }

    await cache.setCache(contextKey, cachedContext, 450);

    // 📌 **Отправляем ответ пользователю в Telegram**
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

    await axios.post(telegramApiUrl, {
      chat_id: chatId,
      text: `🎙 *Ответ на ваш голосовой запрос:*\n\n${botResponse}`,
      parse_mode: 'Markdown',
    });

    res.json({ reply: botResponse });
  } catch (error) {
    console.error('❌ Ошибка сервера при обработке аудио:', error.response?.data || error.message);
    res.status(500).json({ error: 'Ошибка сервера. Попробуйте позже.' });
  }
});

module.exports = audioBotRouter;



















/* const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data'); // Добавляем FormData для Whisper API
const {
  User,
  UserSubscription,
  Subscription,
  SubscriptionModelLimit,
  UserModelRequest,
} = require('../../db/models');
const cache = require('../utils/cacheRedis');
const openai = require('../utils/openai');

const audioBotRouter = express.Router();

// 📌 **ENDPOINT для обработки аудио**
audioBotRouter.post('/process-audio', async (req, res) => {
  console.log('✅ Получен запрос на обработку аудио.');

  const { chatId, base64Audio } = req.body;

  if (!chatId || !base64Audio) {
    console.error('❌ Ошибка: отсутствуют обязательные параметры (chatId, base64Audio).');
    return res.status(400).json({ error: 'Отсутствуют обязательные параметры (chatId, base64Audio).' });
  }

  // 📌 Создаем временный WAV-файл
  const tempAudioFilePath = path.join(__dirname, '../../uploads/temp_audio.wav');

  try {
    // 🔄 Декодируем Base64 и сохраняем файл
    console.log('📥 Декодируем Base64 и сохраняем файл...');
    const audioBuffer = Buffer.from(base64Audio, 'base64');
    fs.writeFileSync(tempAudioFilePath, audioBuffer);

    console.log('🎙 Отправка аудио в Whisper API...');

    // 📌 Создаем FormData для Whisper API
    const formData = new FormData();
    formData.append('file', fs.createReadStream(tempAudioFilePath));
    formData.append('model', 'whisper-1');
    formData.append('language', 'ru');

    // 📌 Отправляем запрос в Whisper API
    const whisperResponse = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders(),
      },
    });

    const transcribedText = whisperResponse.data.text.trim();
    console.log('📝 Распознанный текст:', transcribedText);

    // Удаляем временный файл
    fs.unlinkSync(tempAudioFilePath);

    // 📌 **Формируем контекст для GPT-4o**
    let cachedContext = (await cache.getCache(`audio_context_${chatId}`)) || [];
    cachedContext.push({
      role: 'user',
      content: [{ type: 'text', text: transcribedText }],
    });

    if (cachedContext.length > 3) {
      cachedContext = cachedContext.slice(-3);
    }

    console.log('🤖 Отправка запроса в GPT...');
    const gptResponse = await openai.chat.completions.create({
      model: 'gpt-4o-2024-11-20',
      messages: cachedContext,
      max_tokens: 1200,
      temperature: 0.7,
    });

    const botResponse = gptResponse.choices?.[0]?.message?.content?.trim() || 'Ответ пустой';

    // Сохраняем контекст
    await cache.setCache(`audio_context_${chatId}`, cachedContext, 450);

    // 📌 **Отправляем ответ пользователю в Telegram**
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

    await axios.post(telegramApiUrl, {
      chat_id: chatId,
      text: `🎙 *Ответ на ваш голосовой запрос:*\n\n${botResponse}`,
      parse_mode: 'Markdown',
    });

    res.json({ reply: botResponse });
  } catch (error) {
    console.error('❌ Ошибка сервера при обработке аудио:', error.response?.data || error.message);
    res.status(500).json({ error: 'Ошибка сервера. Попробуйте позже.' });
  }
});

module.exports = audioBotRouter;
*/