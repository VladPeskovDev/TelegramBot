const express = require('express');
const {
  User,
  UserSubscription,
  Subscription,
  SubscriptionModelLimit,
  UserModelRequest,
} = require('../../db/models');
const cache = require('../utils/cacheRedis');
const openai = require('../utils/openai');
const axios = require('axios');
const userRateLimiter = require('../utils/rateLimitConfig');
const { runOcrInWorker } = require('../utils/ocr');

const imageBotRouter = express.Router();

imageBotRouter.route('/process-image').post(userRateLimiter, async (req, res) => {
  const { chatId, base64Image, userMessage } = req.body;

  if (!chatId || !base64Image || !userMessage) {
    console.error('❌ Ошибка: отсутствуют обязательные параметры.');
    return res.status(400).json({ error: 'Отсутствуют обязательные параметры.' });
  }

  const mainKey = `user_${chatId}_imageProcess_model6`;
  const triggerKey = `trigger_${chatId}_imageProcess_model6`;
  const contextKey = `image_context_${chatId}`;

  try {
    // Получаем контекст диалога
    let cachedContext = await cache.getCache(contextKey);
    if (!cachedContext) {
      cachedContext = [];
    }

    let userCache = await cache.getCache(mainKey);
    if (!userCache) {
      const user = await User.findOne({ where: { telegram_id: chatId } });
      if (!user) {
        return res.status(403).json({
          error: 'Вы не зарегистрированы. Используйте команду /start для регистрации.',
        });
      }

      const activeSubscription = await UserSubscription.findOne({
        where: { user_id: user.id },
        include: [{ model: Subscription, as: 'subscription' }],
        order: [['end_date', 'DESC']],
      });

      if (!activeSubscription || new Date(activeSubscription.end_date) < new Date()) {
        return res.status(403).json({
          error: 'У вас нет активной подписки. Пожалуйста, оформите подписку.',
        });
      }

      // Проверка лимита запросов для модели с id 6
      const subscriptionLimit = await SubscriptionModelLimit.findOne({
        where: {
          subscription_id: activeSubscription.subscription.id,
          model_id: 6,
        },
      });

      if (!subscriptionLimit) {
        return res.status(400).json({ error: 'Лимиты для данной подписки и модели не найдены.' });
      }

      const userModelRequest = await UserModelRequest.findOne({
        where: {
          user_id: user.id,
          model_id: 6,
        },
      });
      const currentRequestCount = userModelRequest ? userModelRequest.request_count : 0;

      userCache = {
        userId: user.id,
        requestsLimit: subscriptionLimit.requests_limit,
        requestCount: currentRequestCount,
        syncing: false,
        modelId: 6,
      };
    }

    // Проверка лимита запросов
    if (userCache.requestCount >= userCache.requestsLimit) {
      return res.status(403).json({
        error: `Вы исчерпали лимит запросов для данной модели, рекомендуем оформить подписку (/subscription).`,
      });
    }

    // Увеличиваем счётчик запросов
    userCache.requestCount += 1;

    // Обновление счетчика в БД каждые 5 запросов
    if (userCache.requestCount % 5 === 0 && !userCache.syncing) {
      userCache.syncing = true;
      await UserModelRequest.upsert(
        {
          user_id: userCache.userId,
          model_id: userCache.modelId,
          request_count: userCache.requestCount,
        },
        {
          where: {
            user_id: userCache.userId,
            model_id: userCache.modelId,
          },
        },
      );
      userCache.syncing = false;
    }

    // Формирование контекста: добавляем пользовательское сообщение и изображение
    cachedContext.push({
      role: 'user',
      content: [
        { type: 'text', text: userMessage },
        { type: 'image_url', image_url: { url: base64Image } },
      ],
    });
    if (cachedContext.length > 3) {
      cachedContext = cachedContext.slice(-3);
    }

    // Запрос к OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-2024-11-20',
      messages: cachedContext,
      max_tokens: 1500,
      temperature: 0.7,
    });

    const botResponse = response.choices?.[0]?.message?.content?.trim() || 'Ответ пустой';

    // Сохраняем ответ в контекст и обновляем кеш
    cachedContext.push({ role: 'assistant', content: botResponse });
    if (cachedContext.length > 1) {
      cachedContext = cachedContext.slice(-1);
    }

    await cache.setCache(mainKey, userCache, 450);
    await cache.setCache(triggerKey, '1', 448);
    await cache.setCache(contextKey, cachedContext, 450);

    // Дополнительное кеширование, если ответ небольшой
    if (botResponse.length <= 5000) {
      const respKey = `response_${chatId}_${userMessage}`;
      await cache.setCache(respKey, botResponse, 450);
    }

    res.json({ reply: botResponse });
  } catch (error) {
    console.error('❌ Ошибка сервера (imageProcess model6):', error.message);
    res.status(500).json({ error: error.message || 'Ошибка сервера. Попробуйте позже.' });
  }
});


//ENDPOINT DESKTOP

imageBotRouter.route('/external/image-process').post(userRateLimiter, async (req, res) => {
  const { chatId, base64Image, userMessage } = req.body;

  if (!chatId || !base64Image) {
    return res.status(400).json({ error: 'Отсутствуют обязательные параметры (chatId, base64Image).' });
  }

  const mainKey = `user_${chatId}_imageProcess_model6`;
  const triggerKey = `trigger_${chatId}_imageProcess_model6`;
  const contextKey = `image_context_${chatId}`;

  try {
    let cachedContext = (await cache.getCache(contextKey)) || [];
    let userCache = await cache.getCache(mainKey);

    if (!userCache) {
      const user = await User.findOne({ where: { telegram_id: chatId } });
      if (!user) {
        return res.status(403).json({ error: 'Пользователь не зарегистрирован. Используйте /start в Telegram.' });
      }

      const activeSubscription = await UserSubscription.findOne({
        where: { user_id: user.id },
        include: [{ model: Subscription, as: 'subscription' }],
        order: [['end_date', 'DESC']],
      });

      if (!activeSubscription || new Date(activeSubscription.end_date) < new Date()) {
        return res.status(403).json({ error: 'Нет активной подписки. Пожалуйста, оформите подписку.' });
      }

      const subscriptionLimit = await SubscriptionModelLimit.findOne({
        where: { subscription_id: activeSubscription.subscription.id, model_id: 6 },
      });

      if (!subscriptionLimit) {
        return res.status(400).json({ error: 'Лимиты не найдены для данной подписки и модели.' });
      }

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

    if (userCache.requestCount >= userCache.requestsLimit) {
      return res.status(403).json({ error: 'Вы исчерпали лимит запросов. Оформите подписку.' });
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

    // ✅ OCR через utils
    const extractedText = await runOcrInWorker(base64Image);

    const prompt = userMessage
      ? `${userMessage}\n\nВот код с изображения:\n${extractedText}`
      : `Реши задачу по коду с изображения:\n\n${extractedText}`;

    cachedContext.push({ role: 'user', content: prompt });
    
    if (cachedContext.length > 1) {
      cachedContext = cachedContext.slice(-1);
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-2024-11-20',
      messages: cachedContext,
      max_completion_tokens: 1200,
      temperature: 0.7,
    });

    const botResponse = response.choices?.[0]?.message?.content?.trim() || 'Ответ пустой';

    cachedContext.push({ role: 'assistant', content: botResponse });
    if (cachedContext.length > 0) {
      cachedContext = cachedContext.slice(-0);
    }

    await cache.setCache(contextKey, cachedContext, 450);

    const telegramApiUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;

    await axios.post(telegramApiUrl, {
      chat_id: chatId,
      text: `📜 *Результат задачи по изображению:*\n\n${botResponse}`,
      parse_mode: 'Markdown',
    });

    res.json({ reply: botResponse });
  } catch (error) {
    console.error('❌ Ошибка сервера при обработке изображения:', error.message);
    res.status(500).json({ error: 'Ошибка сервера. Попробуйте позже.' });
  }
});

module.exports = imageBotRouter;
