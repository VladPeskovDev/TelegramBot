// ./routes/openaiO1Router.js
const express = require('express');
const { User, UserSubscription, UserModelRequest, Subscription, SubscriptionModelLimit 
} = require('../../db/models');
const openai = require('../utils/openai');
const cache = require('../utils/cacheRedis'); 
require('dotenv').config();

const openaiO1Router = express.Router();

// Константы TTL
const MAIN_KEY_TTL = 300;     // основной ключ живёт 300 сек
const TRIGGER_KEY_TTL = 298;  // триггер на 2 секунды меньше

openaiO1Router.post('/model_o1-mini-2024-09-12', async (req, res) => {
  const { chatId, userMessage } = req.body;

  console.log(`[DEBUG] POST /model_o1-mini-2024-09-12 : chatId=${chatId}, userMessage="${userMessage}"`);

  if (!userMessage) {
    return res.status(400).json({ error: 'Сообщение не может быть пустым.' });
  }

  const modelName = 'o1-mini-2024-09-12';

  // Основной ключ + триггер-ключ + контекст
  const mainKey = `user_${chatId}_o1-mini-2024-09-12`;
  const triggerKey = `trigger_${chatId}_o1-mini-2024-09-12`;
  const contextKey = `user_${chatId}_o1-mini-2024-09-12_context`;

  try {
    // 1) Считываем из Redis
    let userCache = await cache.getCache(mainKey);
    let userContext = await cache.getCache(contextKey);

    if (!userContext) {
      userContext = [];
    }

    // 2) Если нет userCache в Redis — грузим из БД
    if (!userCache) {
      console.log(`[DEBUG] userCache не найден в Redis, загружаем из БД...`);

      const user = await User.findOne({ where: { telegram_id: chatId } });
      if (!user) {
        return res.status(403).json({
          error: 'Вы не зарегистрированы. Пожалуйста, используйте /start.',
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

      const subscriptionLimit = await SubscriptionModelLimit.findOne({
        where: { 
          subscription_id: activeSubscription.subscription_id,
          model_id: 4, // ID вашей модели
        },
      });

      const userModelRequest = await UserModelRequest.findOne({
        where: { 
          user_id: user.id,
          subscription_id: activeSubscription.id,
          model_id: 4,
        },
      });

      const currentRequestCount = userModelRequest ? userModelRequest.request_count : 0;

      // Формируем объект
      userCache = {
        userId: user.id,
        subscriptionId: activeSubscription.id,
        requestsLimit: subscriptionLimit.requests_limit,
        requestCount: currentRequestCount,
        syncing: false,
        modelId: 4, // предполагаем, что ID модели = 4
      };

      // Сохраняем в основной ключ (TTL=300)
      await cache.setCache(mainKey, userCache, MAIN_KEY_TTL);
      // Ставим/обновляем триггер-ключ (TTL=298)
      await cache.setCache(triggerKey, '1', TRIGGER_KEY_TTL);

    } else {
      console.log(`[DEBUG] userCache найден:`, userCache);
    }

    // 3) Проверяем лимит
    if (userCache.requestCount >= userCache.requestsLimit) {
      return res.status(403).json({
        error: `Вы исчерпали лимит (${userCache.requestsLimit}) для модели ${modelName}.`,
      });
    }

    // 4) Увеличиваем счётчик
    userCache.requestCount += 1;

    // (Опционально) синхронизируем каждые 5 запросов
    if (userCache.requestCount % 5 === 0 && !userCache.syncing) {
      console.log(`[DEBUG] Кратный 5 запрос => Sync в БД`);
      userCache.syncing = true;
      try {
        await UserModelRequest.upsert({
          user_id: userCache.userId,
          subscription_id: userCache.subscriptionId,
          model_id: userCache.modelId,
          request_count: userCache.requestCount,
        }, {
          where: {
            user_id: userCache.userId,
            subscription_id: userCache.subscriptionId,
            model_id: userCache.modelId,
          }
        });
        console.log(`[DEBUG] Sync прошёл успешно (count=${userCache.requestCount})`);
      } catch (err) {
        console.error(`[ERROR] Не удалось sync upsert:`, err.message);
      } finally {
        userCache.syncing = false;
      }
    }

    // Обновим ключи в Redis (продлеваем TTL)
    await cache.setCache(mainKey, userCache, MAIN_KEY_TTL);
    await cache.setCache(triggerKey, '1', TRIGGER_KEY_TTL);

    // 5) Формируем контекст + запрос к OpenAI
    userContext.push({ role: 'user', content: userMessage });
    if (userContext.length > 2) {
      userContext = userContext.slice(-2);
    }

    // Запрос к OpenAI
    const response = await openai.chat.completions.create({
      model: modelName,
      messages: userContext,
      max_completion_tokens: 1500,
    });

    const botResponse = response?.choices?.[0]?.message?.content?.trim() || 'Ответ пустой';

    // 6) Добавляем ответ бота, снова обрезаем до 2 сообщений
    userContext.push({ role: 'assistant', content: botResponse });
    if (userContext.length > 2) {
      userContext = userContext.slice(-2);
    }

    // 7) Сохраняем контекст (TTL=300)
    await cache.setCache(contextKey, userContext, MAIN_KEY_TTL);

    // (Опционально) Кэшируем сам ответ
    if (botResponse.length <= 5000) {
      const responseKey = `response_${chatId}_${userMessage}`;
      await cache.setCache(responseKey, botResponse, MAIN_KEY_TTL);
    }

    // 8) Отправляем ответ
    res.json({ reply: botResponse });

  } catch (error) {
    console.error('❌ Ошибка при обработке сообщения:', error.message);
    res.status(500).json({ error: error.message || 'Ошибка на сервере. Попробуйте позже.' });
  }
});

module.exports = openaiO1Router;





/*  
openaiO1Router.route('/model_o1-mini-2024-09-12').post(async (req, res) => {
  const { chatId, userMessage } = req.body;

  if (!userMessage) {
    return res.status(400).json({ error: 'Сообщение не может быть пустым.' });
  }

  const modelName = "o1-mini-2024-09-12";
  const cacheKey = `user_${chatId}_o1-mini-2024-09-12`;
  const contextKey = `user_${chatId}_o1-mini-2024-09-12_context`;

  try {
    let userCache = await cache.getCache(cacheKey);
    let userContext = await cache.getCache(contextKey) || [];

    if (!userCache) {
      const user = await User.findOne({ where: { telegram_id: chatId } });
      if (!user) {
        return res.status(403).json({
          error: 'Вы не зарегистрированы. Пожалуйста, используйте команду /start для регистрации.',
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

      const subscriptionLimit = await SubscriptionModelLimit.findOne({
        where: { subscription_id: activeSubscription.subscription_id, model_id: 4 },
      });

      const userModelRequest = await UserModelRequest.findOne({
        where: { user_id: user.id, subscription_id: activeSubscription.id, model_id: 4 },
      });

      const currentRequestCount = userModelRequest ? userModelRequest.request_count : 0;

      userCache = {
        userId: user.id,
        subscriptionId: activeSubscription.id,
        requestsLimit: subscriptionLimit.requests_limit,
        requestCount: currentRequestCount,
        syncing: false,
        modelId: 4,
      };

      cache.setCache(cacheKey, userCache, 300); // TTL 5 минут
    }

    // Проверка лимита запросов
    if (userCache.requestCount >= userCache.requestsLimit) {
      return res.status(403).json({
        error: `Вы исчерпали лимит запросов (${userCache.requestsLimit}) для модели ${modelName}.`,
      });
    }

    // Увеличиваем счётчик в кэше
    userCache.requestCount += 1;
    cache.setCache(cacheKey, userCache, 300);

    if (userCache.requestCount % 5 === 0 && !userCache.syncing) {
      userCache.syncing = true;
      await UserModelRequest.upsert({
        user_id: userCache.userId,
        subscription_id: userCache.subscriptionId,
        model_id: userCache.modelId,
        request_count: userCache.requestCount,
      }, {
        where: {
          user_id: userCache.userId,
          subscription_id: userCache.subscriptionId,
          model_id: userCache.modelId,
        }
      });
      userCache.syncing = false;
      cache.setCache(cacheKey, userCache, 300);
    }

    userContext.push({ role: 'user', content: userMessage });
    if (userContext.length > 2) {
      userContext = userContext.slice(-2);
    }

    const response = await openai.chat.completions.create({
      model: modelName,
      messages: userContext,
      max_completion_tokens: 1500,
    });

    const botResponse = response.choices?.[0]?.message?.content?.trim() || 'Ответ пустой';

    userContext.push({ role: 'assistant', content: botResponse });
      if (userContext.length > 4) {
          userContext = userContext.slice(-4);
      }
      cache.setCache(contextKey, userContext, 300);
    
      if (botResponse.length <= 5000) {
          cache.setCache(`response_${chatId}_${userMessage}`, botResponse, 300);
      }
    
      res.json({ reply: botResponse });
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    res.status(500).json({ error: error.message || 'Ошибка на сервере. Попробуйте позже.' });
  }
});

*/