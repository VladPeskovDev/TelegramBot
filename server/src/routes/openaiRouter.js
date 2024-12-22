const express = require('express');
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

  try {
    let userCache = cache.getCache(cacheKey);

    if (!userCache) {
      console.log('🔄 Данные пользователя не найдены в кэше. Запрашиваем из БД...');

      // Запрашиваем пользователя
      const user = await User.findOne({ where: { telegram_id: chatId } });
      if (!user) {
        return res.status(403).json({
          error: 'Вы не зарегистрированы. Пожалуйста, используйте команду /start для регистрации.',
        });
      }

      // Подписка
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

      // Лимиты подписки
      const subscriptionLimit = await SubscriptionModelLimit.findOne({
        where: {
          subscription_id: activeSubscription.subscription_id,
          model_id: 3, // gpt-4o-mini
        },
      });

      if (!subscriptionLimit) {
        return res.status(400).json({ error: 'Лимиты для данной подписки и модели не найдены.' });
      }

      // Запрашиваем счетчик
      const userModelRequest = await UserModelRequest.findOne({
        where: {
          user_id: user.id,
          subscription_id: activeSubscription.id,
          model_id: 3,
        },
      });

      const currentRequestCount = userModelRequest ? userModelRequest.request_count : 0;

      userCache = {
        userId: user.id,
        subscriptionId: activeSubscription.id,
        requestsLimit: subscriptionLimit.requests_limit,
        requestCount: currentRequestCount,
      };

      // Сохраняем данные в кэше
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

    // Увеличиваем счетчик в кэше
    userCache.requestCount += 1;
    cache.setCache(cacheKey, userCache, 300); // Обновляем кэш

    // Периодически синхронизируем с БД (каждые 5 минут)
    if (userCache.requestCount % 5 === 0) {
      console.log('🔄 Синхронизация счетчика с базой данных...');
      await UserModelRequest.upsert({
        user_id: userCache.userId,
        subscription_id: userCache.subscriptionId,
        model_id: 3,
        request_count: userCache.requestCount,
      });
    }

    // Запрос к OpenAI
    const response = await openai.chat.completions.create({
      model: modelName,
      messages: [{ role: 'user', content: userMessage }],
      max_tokens: 1250,
      temperature: 0.7,
    });

    const botResponse = response.choices?.[0]?.message?.content?.trim() || 'Ответ пустой';

    // Ограничиваем размер ответа
    if (botResponse.length <= 5000) {
      cache.setCache(`response_${chatId}_${userMessage}`, botResponse, 300); // Кэшируем ответ на 5 минут
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

  try {
    let userCache = cache.getCache(cacheKey);

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
          model_id: 2, // GPT-4
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
          model_id: 2,
        },
      });

      const currentRequestCount = userModelRequest ? userModelRequest.request_count : 0;

      userCache = {
        userId: user.id,
        subscriptionId: activeSubscription.id,
        requestsLimit: subscriptionLimit.requests_limit,
        requestCount: currentRequestCount,
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

    // Синхронизация каждые 5 запросов
    if (userCache.requestCount % 5 === 0) {
      console.log('🔄 Синхронизация счётчика с БД...');
      await UserModelRequest.upsert({
        user_id: userCache.userId,
        subscription_id: userCache.subscriptionId,
        model_id: 2,
        request_count: userCache.requestCount,
      });
    }

    // Запрос к OpenAI
    const response = await openai.chat.completions.create({
      model: modelName,
      messages: [{ role: 'user', content: userMessage }],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const botResponse = response.choices?.[0]?.message?.content?.trim() || 'Ответ пустой';

    if (botResponse.length <= 5000) {
      cache.setCache(`response_${chatId}_${userMessage}`, botResponse, 300); // Кэшируем ответ
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

  try {
    let userCache = cache.getCache(cacheKey);

    if (!userCache) {
      console.log('🔄 Данные пользователя не найдены в кэше. Запрашиваем из БД...');

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
        where: {
          subscription_id: activeSubscription.subscription_id,
          model_id: 1, // GPT-3.5
        },
      });

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
        requestsLimit: subscriptionLimit.requests_limit,
        requestCount: currentRequestCount,
      };

      cache.setCache(cacheKey, userCache, 300); // Кэш на 5 минут
    } else {
      console.log('✅ Данные пользователя получены из кэша.');
    }

    if (userCache.requestCount >= userCache.requestsLimit) {
      return res.status(403).json({
        error: `Вы исчерпали лимит запросов (${userCache.requestsLimit}) для модели ${modelName}.`,
      });
    }

    userCache.requestCount += 1;
    cache.setCache(cacheKey, userCache, 300);

    if (userCache.requestCount % 5 === 0) {
      console.log('🔄 Синхронизация счётчика с БД...');
      await UserModelRequest.upsert({
        user_id: userCache.userId,
        subscription_id: userCache.subscriptionId,
        model_id: 1,
        request_count: userCache.requestCount,
      });
    }

    const response = await openai.chat.completions.create({
      model: modelName,
      messages: [{ role: 'user', content: userMessage }],
      max_tokens: 500,
      temperature: 0.7,
    });

    res.json({ reply: response.choices?.[0]?.message?.content?.trim() || 'Ответ пустой' });
  } catch (error) {
    console.error('❌ Ошибка при обработке сообщения:', error.message);
    res.status(500).json({ error: 'Ошибка на сервере. Попробуйте позже.' });
  }
});


module.exports = openaiRouter;


//
//model: 'gpt-4o-mini-2024-07-18', /
//router.post('/', async (req, res) => {