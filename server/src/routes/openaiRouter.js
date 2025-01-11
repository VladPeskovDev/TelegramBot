const express = require('express');
const {
  User,
  UserSubscription,
  UserModelRequest,
  Subscription,
  SubscriptionModelLimit,
} = require('../../db/models');
const openai = require('../utils/openai');
const openaiRouter = express.Router();
const cache = require('../utils/cacheRedis');
const { getSystemPromptByType } = require('../utils/numerologyPrompts');
require('dotenv').config();

/* 
  ================================
   1) ЭНДПОИНТ: /model_gpt-4o-mini
  ================================
*/
openaiRouter.route('/model_gpt-4o-mini').post(async (req, res) => {
  const { chatId, userMessage } = req.body;

  if (!userMessage) {
    return res.status(400).json({ error: 'Сообщение не может быть пустым.' });
  }

  // Модель + ключи
  const modelName = 'gpt-4o-mini-2024-07-18';
  const mainKey = `user_${chatId}_gpt-4o-mini`;
  const triggerKey = `trigger_${chatId}_gpt-4o-mini`;
  const contextKey = `user_${chatId}_gpt-4o-mini_context`;

  try {
    let userCache = await cache.getCache(mainKey);
    let userContext = await cache.getCache(contextKey);
    if (!userContext) {
      userContext = [];
    }

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

      const subscriptionPlanId = activeSubscription.subscription.id;
      const subscriptionLimit = await SubscriptionModelLimit.findOne({
        where: {
          subscription_id: subscriptionPlanId,
          model_id: 3,
        },
      });

      if (!subscriptionLimit) {
        return res.status(400).json({ error: 'Лимиты для данной подписки и модели не найдены.' });
      }

      const userModelRequest = await UserModelRequest.findOne({
        where: {
          user_id: user.id,
          model_id: 3,
        },
      });

      const currentRequestCount = userModelRequest ? userModelRequest.request_count : 0;

      userCache = {
        userId: user.id,
        requestsLimit: subscriptionLimit.requests_limit,
        requestCount: currentRequestCount,
        syncing: false,
        modelId: 3,
      };
    } else {
      console.log('✅ Данные пользователя получены из кэша.');
    }

    // Проверка лимита
    if (userCache.requestCount >= userCache.requestsLimit) {
      return res.status(403).json({
        error: `Вы исчерпали лимит запросов для данной модели, рекомендуем приобрести подписку по команде /subscription.`,
      });
    }

    userCache.requestCount += 1;

    if (userCache.requestCount % 5 === 0 && !userCache.syncing) {
      userCache.syncing = true;
      console.log('🔄 Синхронизация счётчика с БД (5 запросов)...');
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

    userContext.push({ role: 'user', content: userMessage });
    if (userContext.length > 4) {
      userContext = userContext.slice(-4);
    }

    const response = await openai.chat.completions.create({
      model: modelName,
      messages: userContext,
      max_tokens: 1250,
      temperature: 0.7,
    });

    const botResponse = response.choices?.[0]?.message?.content?.trim() || 'Ответ пустой';

    userContext.push({ role: 'assistant', content: botResponse });
    if (userContext.length > 4) {
      userContext = userContext.slice(-4);
    }

    await cache.setCache(mainKey, userCache, 300);
    await cache.setCache(triggerKey, '1', 298);
    await cache.setCache(contextKey, userContext, 300);

    if (botResponse.length <= 5000) {
      const respKey = `response_${chatId}_${userMessage}`;
      await cache.setCache(respKey, botResponse, 300);
    }

    res.json({ reply: botResponse });
  } catch (error) {
    console.error('❌ Ошибка при обработке сообщения (gpt-4o-mini):', error.message);
    res.status(500).json({ error: error.message || 'Ошибка на сервере. Попробуйте позже.' });
  }
});

/* 
  ===============================
   2) ЭНДПОИНТ: /model4
  ===============================
*/
openaiRouter.route('/model4').post(async (req, res) => {
  const { chatId, userMessage } = req.body;

  if (!userMessage) {
    return res.status(400).json({ error: 'Сообщение не может быть пустым.' });
  }

  const modelName = 'gpt-4o-2024-05-13';
  const mainKey = `user_${chatId}_model4`;
  const triggerKey = `trigger_${chatId}_model4`;
  const contextKey = `user_${chatId}_model4_context`;

  try {
    let userCache = await cache.getCache(mainKey);
    let userContext = await cache.getCache(contextKey);
    if (!userContext) {
      userContext = [];
    }

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

      const subscriptionPlanId = activeSubscription.subscription.id;
      const subscriptionLimit = await SubscriptionModelLimit.findOne({
        where: {
          subscription_id: subscriptionPlanId,
          model_id: 2,
        },
      });

      if (!subscriptionLimit) {
        return res.status(400).json({ error: 'Лимиты для данной подписки и модели не найдены.' });
      }

      const userModelRequest = await UserModelRequest.findOne({
        where: {
          user_id: user.id,
          model_id: 2,
        },
      });

      const currentRequestCount = userModelRequest ? userModelRequest.request_count : 0;

      userCache = {
        userId: user.id,
        modelId: 2,
        requestsLimit: subscriptionLimit.requests_limit,
        requestCount: currentRequestCount,
        syncing: false,
      };
    } else {
      console.log('✅ Данные пользователя получены из кэша.');
    }

    // Проверка лимита
    if (userCache.requestCount >= userCache.requestsLimit) {
      return res.status(403).json({
        error: `Вы исчерпали лимит запросов для данной модели, рекомендуем приобрести подписку по команде /subscription.`,
      });
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
        {
          where: {
            user_id: userCache.userId,
            model_id: userCache.modelId,
          },
        },
      );
      userCache.syncing = false;
    }

    userContext.push({ role: 'user', content: userMessage });
    if (userContext.length > 4) {
      userContext = userContext.slice(-4);
    }

    const response = await openai.chat.completions.create({
      model: modelName,
      messages: userContext,
      max_tokens: 1000,
      temperature: 0.7,
    });

    const botResponse = response.choices?.[0]?.message?.content?.trim() || 'Ответ пустой';

    userContext.push({ role: 'assistant', content: botResponse });
    if (userContext.length > 4) {
      userContext = userContext.slice(-4);
    }

    await cache.setCache(mainKey, userCache, 300);
    await cache.setCache(triggerKey, '1', 298);

    await cache.setCache(contextKey, userContext, 300);

    if (botResponse.length <= 5000) {
      const respKey = `response_${chatId}_${userMessage}`;
      await cache.setCache(respKey, botResponse, 300);
    }

    res.json({ reply: botResponse });
  } catch (error) {
    console.error('❌ Ошибка при обработке сообщения (model4):', error.message);
    res.status(500).json({ error: error.message || 'Ошибка на сервере. Попробуйте позже.' });
  }
});

/* 
  ===============================
   3) ЭНДПОИНТ: /model3.5
  ===============================
*/
openaiRouter.route('/model3.5').post(async (req, res) => {
  const { chatId, userMessage } = req.body;

  if (!userMessage) {
    return res.status(400).json({ error: 'Сообщение не может быть пустым.' });
  }

  const modelName = 'gpt-3.5-turbo';
  const mainKey = `user_${chatId}_model3.5`;
  const triggerKey = `trigger_${chatId}_model3.5`;
  const contextKey = `user_${chatId}_model3.5_context`;

  try {
    let userCache = await cache.getCache(mainKey);
    let userContext = await cache.getCache(contextKey);
    if (!userContext) {
      userContext = [];
    }

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

      const subscriptionPlanId = activeSubscription.subscription.id;

      const subscriptionLimit = await SubscriptionModelLimit.findOne({
        where: {
          subscription_id: subscriptionPlanId,
          model_id: 1,
        },
      });

      if (!subscriptionLimit) {
        return res.status(400).json({ error: 'Лимиты для данной подписки и модели не найдены.' });
      }

      // Получаем или создаём запись UserModelRequest
      const userModelRequest = await UserModelRequest.findOne({
        where: {
          user_id: user.id,
          model_id: 1,
        },
      });

      const currentRequestCount = userModelRequest ? userModelRequest.request_count : 0;

      userCache = {
        userId: user.id,
        requestsLimit: subscriptionLimit.requests_limit,
        requestCount: currentRequestCount,
        syncing: false,
        modelId: 1,
      };
    } else {
      console.log('✅ Данные пользователя получены из кэша.');
    }

    if (userCache.requestCount >= userCache.requestsLimit) {
      return res.status(403).json({
        error: `Вы исчерпали лимит запросов для данной модели, рекомендуем приобрести подписку по команде /subscription.`,
      });
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
        {
          where: {
            user_id: userCache.userId,
            model_id: userCache.modelId,
          },
        },
      );
      userCache.syncing = false;
    }

    userContext.push({ role: 'user', content: userMessage });
    if (userContext.length > 2) {
      userContext = userContext.slice(-2);
    }

    const response = await openai.chat.completions.create({
      model: modelName,
      messages: userContext,
      max_tokens: 1250,
      temperature: 0.7,
    });

    const botResponse = response.choices?.[0]?.message?.content?.trim() || 'Ответ пустой';

    userContext.push({ role: 'assistant', content: botResponse });
    if (userContext.length > 2) {
      userContext = userContext.slice(-2);
    }

    await cache.setCache(mainKey, userCache, 300);
    await cache.setCache(triggerKey, '1', 298);
    await cache.setCache(contextKey, userContext, 300);

    if (botResponse.length <= 5000) {
      const respKey = `response_${chatId}_${userMessage}`;
      await cache.setCache(respKey, botResponse, 300);
    }

    res.json({ reply: botResponse });
  } catch (error) {
    console.error('❌ Ошибка при обработке сообщения (model3.5):', error.message);
    res.status(500).json({ error: error.message || 'Ошибка на сервере. Попробуйте позже.' });
  }
});

openaiRouter.route('/numerologist').post(async (req, res) => {
  const { chatId, type, userMessage } = req.body;

  if (!userMessage) {
    return res.status(400).json({ error: 'Сообщение не может быть пустым.' });
  }

  const modelName = 'gpt-4o-2024-05-13';
  const MODEL_ID = 5;

  const mainKey = `user_${chatId}_numerologist`;
  const triggerKey = `trigger_${chatId}_numerologist`;
  const contextKey = `user_${chatId}_numerologist_context`;

  try {
    let userCache = await cache.getCache(mainKey);
    let userContext = await cache.getCache(contextKey);
    if (!userContext) {
      userContext = [];
    }

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

      const subscriptionPlanId = activeSubscription.subscription.id;
      const subscriptionLimit = await SubscriptionModelLimit.findOne({
        where: {
          subscription_id: subscriptionPlanId,
          model_id: MODEL_ID,
        },
      });

      if (!subscriptionLimit) {
        return res
          .status(400)
          .json({ error: 'Лимиты для данной подписки и модели (нумерология) не найдены.' });
      }

      const userModelRequest = await UserModelRequest.findOne({
        where: { user_id: user.id, model_id: MODEL_ID },
      });

      const currentRequestCount = userModelRequest ? userModelRequest.request_count : 0;

      userCache = {
        userId: user.id,
        modelId: MODEL_ID,
        requestsLimit: subscriptionLimit.requests_limit,
        requestCount: currentRequestCount,
        syncing: false,
      };
    } else {
      console.log('✅ [numerologist] Данные пользователя получены из кэша.');
    }

    // 3) Проверка лимита
    if (userCache.requestCount >= userCache.requestsLimit) {
      return res.status(403).json({
        error: `Вы исчерпали лимит запросов для данной модели, рекомендуем приобрести подписку по команде /subscription.`,
      });
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
        {
          where: {
            user_id: userCache.userId,
            model_id: userCache.modelId,
          },
        },
      );
      userCache.syncing = false;
    }

    // (а) Берём системный промпт в зависимости от type
    const systemPrompt = getSystemPromptByType(type);
    userContext.push({ role: 'system', content: systemPrompt });
    userContext.push({ role: 'user', content: userMessage });

    if (userContext.length > 4) {
      userContext = userContext.slice(-4);
    }

    // 6) Запрос к OpenAI
    const response = await openai.chat.completions.create({
      model: modelName,
      messages: userContext,
      max_tokens: 1000,
      temperature: 0.9,
    });

    const botResponse = response.choices?.[0]?.message?.content?.trim() || 'Ответ пустой';

    userContext.push({ role: 'assistant', content: botResponse });
    if (userContext.length > 4) {
      userContext = userContext.slice(-4);
    }

    await cache.setCache(mainKey, userCache, 300);
    await cache.setCache(triggerKey, '1', 298);
    await cache.setCache(contextKey, userContext, 300);

    if (botResponse.length <= 5000) {
      const respKey = `response_${chatId}_${userMessage}`;
      await cache.setCache(respKey, botResponse, 300);
    }
    res.json({ reply: botResponse });
  } catch (error) {
    console.error('❌ Ошибка при обработке сообщения (numerologist):', error.message);
    return res.status(500).json({ error: error.message || 'Ошибка на сервере. Попробуйте позже.' });
  }
});

module.exports = openaiRouter;

/* const express = require('express');
const { User, UserSubscription, UserModelRequest, Subscription, SubscriptionModelLimit } = require('../../db/models'); 
const openai = require('../utils/openai');
const openaiRouter = express.Router();
const cache = require('../utils/cache');
require('dotenv').config();


openaiRouter.route('/model_gpt-4o-mini').post(async (req, res) => {
  const { chatId, userMessage } = req.body;

  if (!userMessage) {
    return res.status(400).json({ error: 'Сообщение не может быть пустым.' });
  }

  const modelName = "gpt-4o-mini-2024-07-18";
  const cacheKey = `user_${chatId}_gpt-4o-mini`;
  const contextKey = `user_${chatId}_gpt-4o-mini_context`;

  try {
    let userCache = cache.getCache(cacheKey);
    let userContext = cache.getCache(contextKey) || [];

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
        where: { subscription_id: activeSubscription.subscription_id, model_id: 3 },
      });

      if (!subscriptionLimit) {
        return res.status(400).json({ error: 'Лимиты для данной подписки и модели не найдены.' });
      }

      const userModelRequest = await UserModelRequest.findOne({
        where: { user_id: user.id, subscription_id: activeSubscription.id, model_id: 3 },
      });

      const currentRequestCount = userModelRequest ? userModelRequest.request_count : 0;

      userCache = {
        userId: user.id,
        subscriptionId: activeSubscription.id,
        requestsLimit: subscriptionLimit.requests_limit,
        requestCount: currentRequestCount,
        syncing: false,
        modelId: 3,
      };

      cache.setCache(cacheKey, userCache, 300); // Кэш на 5 минут
    }

    if (userCache.requestCount >= userCache.requestsLimit) {
      return res.status(403).json({
        error: `Вы исчерпали лимит запросов (${userCache.requestsLimit}) для модели ${modelName}.`,
      });
    }

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
    if (userContext.length > 4) {
      userContext = userContext.slice(-4);
    }

    const response = await openai.chat.completions.create({
      model: modelName,
      messages: userContext,
      max_tokens: 1250,
      temperature: 0.7,
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
    console.error('❌ Ошибка при обработке сообщения:', error.message);
    res.status(500).json({ error: error.message || 'Ошибка на сервере. Попробуйте позже.' });
  }
});

//------------------>следующий endpoint<----------------

openaiRouter.route('/model4').post(async (req, res) => {
  const { chatId, userMessage } = req.body;

  if (!userMessage) {
    return res.status(400).json({ error: 'Сообщение не может быть пустым.' });
  }

  const modelName = "gpt-4o-2024-05-13";
  const cacheKey = `user_${chatId}_model4`;
  const contextKey = `user_${chatId}_model4_context`;

  try {
    // 🔄 Получаем данные пользователя из кэша
    let userCache = cache.getCache(cacheKey);
    let userContext = cache.getCache(contextKey) || [];

    if (!userCache) {
      console.log('🔄 Данные пользователя не найдены в кэше. Запрашиваем из БД...');

      // 🧑‍💻 Запрашиваем пользователя
      const user = await User.findOne({ where: { telegram_id: chatId } });
      if (!user) {
        return res.status(403).json({
          error: 'Вы не зарегистрированы. Пожалуйста, используйте команду /start для регистрации.',
        });
      }

      // 📅 Проверяем подписку
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

      // 📊 Проверяем лимиты
      const subscriptionLimit = await SubscriptionModelLimit.findOne({
        where: { subscription_id: activeSubscription.subscription_id, model_id: 2 },
      });

      if (!subscriptionLimit) {
        return res.status(400).json({ error: 'Лимиты для данной подписки и модели не найдены.' });
      }

      // 📈 Проверяем счётчик запросов
      const userModelRequest = await UserModelRequest.findOne({
        where: { user_id: user.id, subscription_id: activeSubscription.id, model_id: 2 },
      });

      const currentRequestCount = userModelRequest ? userModelRequest.request_count : 0;

      // 🗂️ Сохраняем в кэш
      userCache = {
        userId: user.id,
        subscriptionId: activeSubscription.id,
        modelId: 2,
        requestsLimit: subscriptionLimit.requests_limit,
        requestCount: currentRequestCount,
        syncing: false,
      };

      cache.setCache(cacheKey, userCache, 300); // Кэш на 5 минут
    } else {
      console.log('✅ Данные пользователя получены из кэша.');
    }

    // 🚨 Проверка лимита запросов
    if (userCache.requestCount >= userCache.requestsLimit) {
      return res.status(403).json({
        error: `Вы исчерпали лимит запросов (${userCache.requestsLimit}) для модели ${modelName}.`,
      });
    }

    // 🧮 Увеличиваем счётчик запросов
    userCache.requestCount += 1;
    cache.setCache(cacheKey, userCache, 300);

    // 🔄 Синхронизация каждые 5 запросов
    if (userCache.requestCount % 5 === 0 && !userCache.syncing) {
      userCache.syncing = true;
      console.log('🔄 Синхронизация счётчика с БД (5 запросов)...');
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

    // 💬 Сохраняем сообщение пользователя в контекст
    userContext.push({ role: 'user', content: userMessage });

    // Ограничиваем длину контекста (только последние 2 сообщения)
    if (userContext.length > 4) {
      userContext = userContext.slice(-4);
    }

    // 📦 Запрос к OpenAI с контекстом
    const response = await openai.chat.completions.create({
      model: modelName,
      messages: userContext,
      max_tokens: 1000,
      temperature: 0.7,
    });

    const botResponse = response.choices?.[0]?.message?.content?.trim() || 'Ответ пустой';

    // 💬 Добавляем ответ ассистента в контекст
    userContext.push({ role: 'assistant', content: botResponse });

    // Ограничиваем длину контекста (только последние 2 сообщения)
    if (userContext.length > 2) {
      userContext = userContext.slice(-2);
    }

    // Сохраняем контекст в кэш
    cache.setCache(contextKey, userContext, 300);

    // 🗂️ Кэшируем последний ответ отдельно
    if (botResponse.length <= 5000) {
      cache.setCache(`response_${chatId}_${userMessage}`, botResponse, 300);
    }

    res.json({ reply: botResponse });
  } catch (error) {
    console.error('❌ Ошибка при обработке сообщения:', error.message);
    res.status(500).json({ error: error.message || 'Ошибка на сервере. Попробуйте позже.' });
  }
});

//------------------>следующий endpoint<----------------

openaiRouter.route('/model3.5').post(async (req, res) => {
  const { chatId, userMessage } = req.body;

  if (!userMessage) {
    return res.status(400).json({ error: 'Сообщение не может быть пустым.' });
  }

  const modelName = "gpt-3.5-turbo";
  const cacheKey = `user_${chatId}_model3.5`;
  const contextKey = `user_${chatId}_model3.5_context`;

  try {
    let userCache = cache.getCache(cacheKey);
    let userContext = cache.getCache(contextKey) || [];

    if (!userCache) {
      console.log('🔄 Данные пользователя не найдены в кэше. Запрашиваем из БД...');

      // Запрашиваем пользователя
      const user = await User.findOne({ where: { telegram_id: chatId } });
      if (!user) {
        return res.status(403).json({
          error: 'Вы не зарегистрированы. Пожалуйста, используйте команду /start для регистрации.',
        });
      }

      // Проверяем подписку
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

      // Проверяем лимиты
      const subscriptionLimit = await SubscriptionModelLimit.findOne({
        where: {
          subscription_id: activeSubscription.subscription_id,
          model_id: 1,
        },
      });

      if (!subscriptionLimit) {
        return res.status(400).json({ error: 'Лимиты для данной подписки и модели не найдены.' });
      }

      // Проверяем счётчик
      const userModelRequest = await UserModelRequest.findOne({
        where: {
          user_id: user.id,
          subscription_id: activeSubscription.id,
          model_id: 1,
        },
      });

      const currentRequestCount = userModelRequest ? userModelRequest.request_count : 0;

      userCache = {
        userId: user.id,
        subscriptionId: activeSubscription.id,
        modelId: 1,
        requestsLimit: subscriptionLimit.requests_limit,
        requestCount: currentRequestCount,
        syncing: false,
      };

      cache.setCache(cacheKey, userCache, 300); // Кэш на 5 минут
    } else {
      console.log('✅ Данные пользователя получены из кэша.');
    }

    // Проверяем лимиты
    if (userCache.requestCount >= userCache.requestsLimit) {
      return res.status(403).json({
        error: `Вы исчерпали лимит запросов (${userCache.requestsLimit}) для модели ${modelName}.`,
      });
    }

    // Увеличиваем счётчик в кэше
    userCache.requestCount += 1;
    cache.setCache(cacheKey, userCache, 300);

    // 🔄 Синхронизация каждые 5 запросов
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
    if (userContext.length > 4) {
      userContext = userContext.slice(-4);
    }

    // 📦 Запрос к OpenAI
    const response = await openai.chat.completions.create({
      model: modelName,
      messages: userContext,
      max_tokens: 1250,
      temperature: 0.7,
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
    console.error('❌ Ошибка при обработке сообщения:', error.message);
    res.status(500).json({ error: error.message || 'Ошибка на сервере. Попробуйте позже.' });
  }
});


module.exports = openaiRouter; */

//ngrok http 3000
