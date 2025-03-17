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

const imageBotRouter = express.Router();

imageBotRouter.route('/process-image').post(async (req, res) => {
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
      max_tokens: 1200,
      temperature: 0.7,
    });

    const botResponse = response.choices?.[0]?.message?.content?.trim() || 'Ответ пустой';

    // Сохраняем ответ в контекст и обновляем кеш
    cachedContext.push({ role: 'assistant', content: botResponse });
    if (cachedContext.length > 3) {
      cachedContext = cachedContext.slice(-3);
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

imageBotRouter.route('/external/image-process').post(async (req, res) => {
  const { chatId, base64Image, userMessage } = req.body;

  if (!chatId || !base64Image) {
    console.error('❌ Ошибка: отсутствуют обязательные параметры.');
    return res
      .status(400)
      .json({ error: 'Отсутствуют обязательные параметры (chatId, base64Image).' });
  }

  const mainKey = `user_${chatId}_imageProcess_model6`;
  const triggerKey = `trigger_${chatId}_imageProcess_model6`;
  const contextKey = `image_context_${chatId}`;

  try {
    // Получаем контекст диалога пользователя
    let cachedContext = (await cache.getCache(contextKey)) || [];

    // Проверяем подписку и лимиты пользователя
    let userCache = await cache.getCache(mainKey);
    if (!userCache) {
      const user = await User.findOne({ where: { telegram_id: chatId } });
      if (!user) {
        return res
          .status(403)
          .json({
            error: 'Пользователь не зарегистрирован в боте. Используйте /start в Telegram.',
          });
      }

      const activeSubscription = await UserSubscription.findOne({
        where: { user_id: user.id },
        include: [{ model: Subscription, as: 'subscription' }],
        order: [['end_date', 'DESC']],
      });

      if (!activeSubscription || new Date(activeSubscription.end_date) < new Date()) {
        return res
          .status(403)
          .json({ error: 'У вас нет активной подписки. Пожалуйста, оформите подписку.' });
      }

      // Проверка лимитов подписки
      const subscriptionLimit = await SubscriptionModelLimit.findOne({
        where: { subscription_id: activeSubscription.subscription.id, model_id: 6 },
      });

      if (!subscriptionLimit) {
        return res.status(400).json({ error: 'Лимиты для данной подписки и модели не найдены.' });
      }

      // Проверка количества использованных запросов
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

    // Проверяем, не превышен ли лимит запросов
    if (userCache.requestCount >= userCache.requestsLimit) {
      return res
        .status(403)
        .json({ error: 'Вы исчерпали лимит запросов. Оформите подписку (/subscription).' });
    }

    // Увеличиваем счётчик запросов
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

    // Обновляем кеш
    await cache.setCache(mainKey, userCache, 450);
    await cache.setCache(triggerKey, '1', 448);

    // **Формирование контекста запроса**
    cachedContext.push({
      role: 'user',
      content: [
        { type: 'text', text: userMessage || 'Определите, что изображено на фото.' },
        { type: 'image_url', image_url: { url: base64Image } },
      ],
    });

    if (cachedContext.length > 3) {
      cachedContext = cachedContext.slice(-3);
    }

    // Отправляем запрос в OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-2024-11-20',
      messages: cachedContext,
      max_completion_tokens: 1200,
      temperature: 0.7,
    });

    const botResponse = response.choices?.[0]?.message?.content?.trim() || 'Ответ пустой';

    // Сохраняем контекст
    cachedContext.push({ role: 'assistant', content: botResponse });
    if (cachedContext.length > 3) {
      cachedContext = cachedContext.slice(-3);
    }

    await cache.setCache(contextKey, cachedContext, 450);

    // **Отправляем ответ пользователю в Telegram**
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

    await axios.post(telegramApiUrl, {
      chat_id: chatId,
      text: `📸 *Ответ на изображение:*\n\n${botResponse}`,
      parse_mode: 'Markdown',
    });

    res.json({ reply: botResponse });
  } catch (error) {
    console.error('❌ Ошибка сервера при обработке изображения:', error.message);
    res.status(500).json({ error: 'Ошибка сервера. Попробуйте позже.' });
  }
});

module.exports = imageBotRouter;
