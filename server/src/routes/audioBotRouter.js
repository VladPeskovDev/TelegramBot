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

// 🔐 Функция экранирования текста для MarkdownV2 Telegram
function escapeMarkdownV2(text) {
  return text
    .replace(/\\/g, '\\\\') // сначала экранируем слэши
    .replace(/[_*[\]()~`>#+\-=|{}.!]/g, (match) => `\\${match}`);
}

/*  MODEL GPT 4o  */

audioBotRouter.route('/process-audio').post(userRateLimiter, async (req, res) => {
  console.log('✅ Получен запрос на обработку аудио.');

  const { chatId, base64Audio, userPrompt } = req.body;

  if (!chatId || !base64Audio) {
    console.error('❌ Ошибка: отсутствуют обязательные параметры (chatId, base64Audio).');
    return res.status(400).json({ error: 'Отсутствуют обязательные параметры (chatId, base64Audio).' });
  }

  const tempAudioFilePath = path.join(__dirname, '../../uploads/temp_audio.wav');
  const mainKey = `user_${chatId}_audioProcess_model2`;
  const triggerKey = `trigger_${chatId}_audioProcess_model2`;
  const contextKey = `audio_context_${chatId}`;

  try {
    console.log('📥 Декодируем Base64 и сохраняем файл...');
    const audioBuffer = Buffer.from(base64Audio, 'base64');
    fs.writeFileSync(tempAudioFilePath, audioBuffer);

    let cachedContext = (await cache.getCache(contextKey)) || [];

    let userCache = await cache.getCache(mainKey);
    if (!userCache) {
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

      const subscriptionLimit = await SubscriptionModelLimit.findOne({
        where: { subscription_id: activeSubscription.subscription.id, model_id: 2 },
      });

      if (!subscriptionLimit) {
        return res.status(400).json({ error: 'Лимиты для данной подписки и модели не найдены.' });
      }

      const userModelRequest = await UserModelRequest.findOne({
        where: { user_id: user.id, model_id: 2 },
      });

      const currentRequestCount = userModelRequest ? userModelRequest.request_count : 0;

      userCache = {
        userId: user.id,
        requestsLimit: subscriptionLimit.requests_limit,
        requestCount: currentRequestCount,
        syncing: false,
        modelId: 2,
      };

      await cache.setCache(mainKey, userCache, 450);
    }

    if (userCache.requestCount >= userCache.requestsLimit) {
      return res.status(403).json({ error: 'Вы исчерпали лимит запросов. Оформите подписку (/subscription).' });
    }

    userCache.requestCount += 1;

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

    await cache.setCache(mainKey, userCache, 450);
    await cache.setCache(triggerKey, '1', 448);

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

    fs.unlinkSync(tempAudioFilePath);

    cachedContext.push({
      role: 'system',
      content: userPrompt || 'Проанализируй расшифрованное голосовое сообщение пользователя и если там есть вопрос ответь на него.',
    });

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
      max_tokens: 1750,
      temperature: 0.7,
    });

    const botResponse = gptResponse.choices?.[0]?.message?.content?.trim() || 'Ответ пустой';

    cachedContext.push({ role: 'assistant', content: botResponse });
    if (cachedContext.length > 0) {
      cachedContext = cachedContext.slice(-0);
    }

    await cache.setCache(contextKey, cachedContext, 450);

    // Отправляем сообщение в Telegram по 4000 символов и с экранированием
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const TELEGRAM_LIMIT = 4000;
    const header = '🎙 *Ответ на ваш голосовой запрос:*\n\n';
    const escaped = escapeMarkdownV2(botResponse);
    const chunks = [];

    if ((header + escaped).length <= TELEGRAM_LIMIT) {
      chunks.push(header + escaped);
    } else {
      chunks.push(header);
      let remaining = escaped;
      while (remaining.length > 0) {
        chunks.push(remaining.slice(0, TELEGRAM_LIMIT));
        remaining = remaining.slice(TELEGRAM_LIMIT);
      }
    }

    for (const part of chunks) {
      await axios.post(telegramApiUrl, {
        chat_id: chatId,
        text: part,
        parse_mode: 'MarkdownV2',
      });
    }

    res.json({ reply: botResponse });
  } catch (error) {
    console.error('❌ Ошибка сервера при обработке аудио:', error.response?.data || error.message);
    res.status(500).json({ error: 'Ошибка сервера. Попробуйте позже.' });
  }
});

/* ENDPOINT MODEL GPT-o3-mini  */

audioBotRouter.route('/process-audio-GPT-o3-mini').post(userRateLimiter, async (req, res) => {
  console.log('✅ Получен запрос на обработку аудио.');

  const { chatId, base64Audio, userPrompt } = req.body;

  if (!chatId || !base64Audio) {
    console.error('❌ Ошибка: отсутствуют обязательные параметры (chatId, base64Audio).');
    return res.status(400).json({ error: 'Отсутствуют обязательные параметры (chatId, base64Audio).' });
  }

  const tempAudioFilePath = path.join(__dirname, '../../uploads/temp_audio.wav');
  const mainKey = `user_${chatId}_audioProcess_model1`;
  const triggerKey = `trigger_${chatId}_audioProcess_model1`;
  const contextKey = `audio_context_${chatId}`;

  try {
    console.log('📥 Декодируем Base64 и сохраняем файл...');
    const audioBuffer = Buffer.from(base64Audio, 'base64');
    fs.writeFileSync(tempAudioFilePath, audioBuffer);

    let cachedContext = (await cache.getCache(contextKey)) || [];

    let userCache = await cache.getCache(mainKey);
    if (!userCache) {
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

      const subscriptionLimit = await SubscriptionModelLimit.findOne({
        where: { subscription_id: activeSubscription.subscription.id, model_id: 1 },
      });

      if (!subscriptionLimit) {
        return res.status(400).json({ error: 'Лимиты для данной подписки и модели не найдены.' });
      }

      const userModelRequest = await UserModelRequest.findOne({
        where: { user_id: user.id, model_id: 1 },
      });

      const currentRequestCount = userModelRequest ? userModelRequest.request_count : 0;

      userCache = {
        userId: user.id,
        requestsLimit: subscriptionLimit.requests_limit,
        requestCount: currentRequestCount,
        syncing: false,
        modelId: 1,
      };

      await cache.setCache(mainKey, userCache, 450);
    }

    if (userCache.requestCount >= userCache.requestsLimit) {
      return res.status(403).json({ error: 'Вы исчерпали лимит запросов. Оформите подписку (/subscription).' });
    }

    userCache.requestCount += 1;

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

    await cache.setCache(mainKey, userCache, 450);
    await cache.setCache(triggerKey, '1', 448);

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

    fs.unlinkSync(tempAudioFilePath);

    cachedContext.push({
      role: 'system',
      content: userPrompt || 'Проанализируй расшифрованное голосовое сообщение пользователя и если там есть вопрос ответь на него.',
    });

    cachedContext.push({
      role: 'user',
      content: [{ type: 'text', text: transcribedText }],
    });

    if (cachedContext.length > 0) {
      cachedContext = cachedContext.slice(-0);
    }

    console.log('🤖 Отправка запроса в GPT...');
    const gptResponse = await openai.chat.completions.create({
      model: 'o3-mini-2025-01-31',
      messages: cachedContext,
      max_completion_tokens: 8000,
    });

    const botResponse = gptResponse.choices?.[0]?.message?.content?.trim() || 'Ответ пустой';

    cachedContext.push({ role: 'assistant', content: botResponse });
    if (cachedContext.length > 0) {
      cachedContext = cachedContext.slice(-0);
    }

    await cache.setCache(contextKey, cachedContext, 450);

    // Отправляем сообщение в Telegram по 4000 символов и с экранированием
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const TELEGRAM_LIMIT = 4000;
    const header = '🎙 *Ответ на ваш голосовой запрос:*\n\n';
    const escaped = escapeMarkdownV2(botResponse);
    const chunks = [];

    if ((header + escaped).length <= TELEGRAM_LIMIT) {
      chunks.push(header + escaped);
    } else {
      chunks.push(header);
      let remaining = escaped;
      while (remaining.length > 0) {
        chunks.push(remaining.slice(0, TELEGRAM_LIMIT));
        remaining = remaining.slice(TELEGRAM_LIMIT);
      }
    }

    for (const part of chunks) {
      await axios.post(telegramApiUrl, {
        chat_id: chatId,
        text: part,
        parse_mode: 'MarkdownV2',
      });
    }

    res.json({ reply: botResponse });
  } catch (error) {
    console.error('❌ Ошибка сервера при обработке аудио:', error.response?.data || error.message);
    res.status(500).json({ error: 'Ошибка сервера. Попробуйте позже.' });
  }
});


/* ENDPOINT MODEL GPT 4o - MINI */

audioBotRouter.route('/process-audio-GPT-4o-mini').post(userRateLimiter, async (req, res) => {
  console.log('✅ Получен запрос на обработку аудио.');

  const { chatId, base64Audio, userPrompt } = req.body;

  if (!chatId || !base64Audio) {
    console.error('❌ Ошибка: отсутствуют обязательные параметры (chatId, base64Audio).');
    return res.status(400).json({ error: 'Отсутствуют обязательные параметры (chatId, base64Audio).' });
  }

  const tempAudioFilePath = path.join(__dirname, '../../uploads/temp_audio.wav');
  const mainKey = `user_${chatId}_audioProcess_model3`;
  const triggerKey = `trigger_${chatId}_audioProcess_model3`;
  const contextKey = `audio_context_${chatId}`;

  try {
    console.log('📥 Декодируем Base64 и сохраняем файл...');
    const audioBuffer = Buffer.from(base64Audio, 'base64');
    fs.writeFileSync(tempAudioFilePath, audioBuffer);

    let cachedContext = (await cache.getCache(contextKey)) || [];

    let userCache = await cache.getCache(mainKey);
    if (!userCache) {
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

      const subscriptionLimit = await SubscriptionModelLimit.findOne({
        where: { subscription_id: activeSubscription.subscription.id, model_id: 3 },
      });

      if (!subscriptionLimit) {
        return res.status(400).json({ error: 'Лимиты для данной подписки и модели не найдены.' });
      }

      const userModelRequest = await UserModelRequest.findOne({
        where: { user_id: user.id, model_id: 3 },
      });

      const currentRequestCount = userModelRequest ? userModelRequest.request_count : 0;

      userCache = {
        userId: user.id,
        requestsLimit: subscriptionLimit.requests_limit,
        requestCount: currentRequestCount,
        syncing: false,
        modelId: 3,
      };

      await cache.setCache(mainKey, userCache, 450);
    }

    if (userCache.requestCount >= userCache.requestsLimit) {
      return res.status(403).json({ error: 'Вы исчерпали лимит запросов. Оформите подписку (/subscription).' });
    }

    userCache.requestCount += 1;

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

    await cache.setCache(mainKey, userCache, 450);
    await cache.setCache(triggerKey, '1', 448);

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

    fs.unlinkSync(tempAudioFilePath);

    cachedContext.push({
      role: 'system',
      content: userPrompt || 'Проанализируй расшифрованное голосовое сообщение пользователя и если там есть вопрос ответь на него.',
    });

    cachedContext.push({
      role: 'user',
      content: [{ type: 'text', text: transcribedText }],
    });

    if (cachedContext.length > 0) {
      cachedContext = cachedContext.slice(-0);
    }

    console.log('🤖 Отправка запроса в GPT...');
    const gptResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini-2024-07-18',
      messages: cachedContext,
      max_tokens: 1750,
      temperature: 0.7,
    });

    const botResponse = gptResponse.choices?.[0]?.message?.content?.trim() || 'Ответ пустой';

    cachedContext.push({ role: 'assistant', content: botResponse });
    if (cachedContext.length > 0) {
      cachedContext = cachedContext.slice(-0);
    }

    await cache.setCache(contextKey, cachedContext, 450);

    // Отправляем сообщение в Telegram по 4000 символов и с экранированием
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const TELEGRAM_LIMIT = 4000;
    const header = '🎙 *Ответ на ваш голосовой запрос:*\n\n';
    const escaped = escapeMarkdownV2(botResponse);
    const chunks = [];

    if ((header + escaped).length <= TELEGRAM_LIMIT) {
      chunks.push(header + escaped);
    } else {
      chunks.push(header);
      let remaining = escaped;
      while (remaining.length > 0) {
        chunks.push(remaining.slice(0, TELEGRAM_LIMIT));
        remaining = remaining.slice(TELEGRAM_LIMIT);
      }
    }

    for (const part of chunks) {
      await axios.post(telegramApiUrl, {
        chat_id: chatId,
        text: part,
        parse_mode: 'MarkdownV2',
      });
    }

    res.json({ reply: botResponse });
  } catch (error) {
    console.error('❌ Ошибка сервера при обработке аудио:', error.response?.data || error.message);
    res.status(500).json({ error: 'Ошибка сервера. Попробуйте позже.' });
  }
});

/* ENDPOINT MODEL GPT-o1  */

audioBotRouter.route('/process-audio-GPT-o1').post(userRateLimiter, async (req, res) => {
  console.log('✅ Получен запрос на обработку аудио.');

  const { chatId, base64Audio, userPrompt } = req.body;

  if (!chatId || !base64Audio) {
    console.error('❌ Ошибка: отсутствуют обязательные параметры (chatId, base64Audio).');
    return res.status(400).json({ error: 'Отсутствуют обязательные параметры (chatId, base64Audio).' });
  }

  const tempAudioFilePath = path.join(__dirname, '../../uploads/temp_audio.wav');
  const mainKey = `user_${chatId}_audioProcess_model4`;
  const triggerKey = `trigger_${chatId}_audioProcess_model4`;
  const contextKey = `audio_context_${chatId}`;

  try {
    console.log('📥 Декодируем Base64 и сохраняем файл...');
    const audioBuffer = Buffer.from(base64Audio, 'base64');
    fs.writeFileSync(tempAudioFilePath, audioBuffer);

    let cachedContext = (await cache.getCache(contextKey)) || [];

    let userCache = await cache.getCache(mainKey);
    if (!userCache) {
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

      const subscriptionLimit = await SubscriptionModelLimit.findOne({
        where: { subscription_id: activeSubscription.subscription.id, model_id: 4 },
      });

      if (!subscriptionLimit) {
        return res.status(400).json({ error: 'Лимиты для данной подписки и модели не найдены.' });
      }

      const userModelRequest = await UserModelRequest.findOne({
        where: { user_id: user.id, model_id: 4 },
      });

      const currentRequestCount = userModelRequest ? userModelRequest.request_count : 0;

      userCache = {
        userId: user.id,
        requestsLimit: subscriptionLimit.requests_limit,
        requestCount: currentRequestCount,
        syncing: false,
        modelId: 4,
      };

      await cache.setCache(mainKey, userCache, 450);
    }

    if (userCache.requestCount >= userCache.requestsLimit) {
      return res.status(403).json({ error: 'Вы исчерпали лимит запросов. Оформите подписку (/subscription).' });
    }

    userCache.requestCount += 1;

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

    await cache.setCache(mainKey, userCache, 450);
    await cache.setCache(triggerKey, '1', 448);

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

    fs.unlinkSync(tempAudioFilePath);

    // GPT-o1 не поддерживает role: system, поэтому объединяем prompt и текст в user-сообщение
    const mergedUserMessage = `${userPrompt || ''}\n\n${transcribedText}`.trim();

    cachedContext.push({
     role: 'user',
     content: [{ type: 'text', text: mergedUserMessage }],
     });


    if (cachedContext.length > 0) {
      cachedContext = cachedContext.slice(-0);
    }

    console.log('🤖 Отправка запроса в GPT...');
    const gptResponse = await openai.chat.completions.create({
      model: 'o1-preview',
      messages: cachedContext,
      max_completion_tokens: 8000,
    });

    const botResponse = gptResponse.choices?.[0]?.message?.content?.trim() || 'Ответ пустой';

    cachedContext.push({ role: 'assistant', content: botResponse });
    if (cachedContext.length > 0) {
      cachedContext = cachedContext.slice(-0);
    }

    await cache.setCache(contextKey, cachedContext, 450);

    // Отправляем сообщение в Telegram по 4000 символов и с экранированием
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const TELEGRAM_LIMIT = 4000;
    const header = '🎙 *Ответ на ваш голосовой запрос:*\n\n';
    const escaped = escapeMarkdownV2(botResponse);
    const chunks = [];

    if ((header + escaped).length <= TELEGRAM_LIMIT) {
      chunks.push(header + escaped);
    } else {
      chunks.push(header);
      let remaining = escaped;
      while (remaining.length > 0) {
        chunks.push(remaining.slice(0, TELEGRAM_LIMIT));
        remaining = remaining.slice(TELEGRAM_LIMIT);
      }
    }

    for (const part of chunks) {
      await axios.post(telegramApiUrl, {
        chat_id: chatId,
        text: part,
        parse_mode: 'MarkdownV2',
      });
    }

    res.json({ reply: botResponse });
  } catch (error) {
    console.error('❌ Ошибка сервера при обработке аудио:', error.response?.data || error.message);
    res.status(500).json({ error: 'Ошибка сервера. Попробуйте позже.' });
  }
});




module.exports = audioBotRouter;
















