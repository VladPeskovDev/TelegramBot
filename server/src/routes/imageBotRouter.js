const express = require('express');
const { User, UserSubscription, Subscription } = require('../../db/models');
const cache = require('../utils/cacheRedis');
const openai = require('../utils/openai');

const imageBotRouter = express.Router();

imageBotRouter.route('/process-image').post(async (req, res) => {
  const { chatId, base64Image, userMessage } = req.body;

  if (!chatId || !base64Image || !userMessage) {
    console.error('❌ Ошибка: отсутствуют обязательные параметры.');
    return res.status(400).json({ error: 'Отсутствуют обязательные параметры.' });
  }

  try {
    const cacheKey = `image_context_${chatId}`;
    let cachedContext = await cache.getCache(cacheKey);
    if (!cachedContext) {
      cachedContext = [];
    }

    // Проверка подписки пользователя
    let userCache = await cache.getCache(`user_${chatId}_imageProcess`);
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

      userCache = { userId: user.id, hasActiveSubscription: true };
      await cache.setCache(`user_${chatId}_imageProcess`, userCache, 600);
    }

    if (!userCache.hasActiveSubscription) {
      return res.status(403).json({ error: 'У вас нет подписки.' });
    }

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
      model: 'o1',
      messages: cachedContext,
      max_completion_tokens: 500
    });
    

    const botResponse = response.choices?.[0]?.message?.content?.trim() || 'Ответ пустой';

    await cache.setCache(cacheKey, cachedContext, 450);

    res.json({ reply: botResponse });

  } catch (error) {
    console.error('❌ Ошибка сервера:', error.message);
    res.status(500).json({ error: 'Ошибка сервера. Попробуйте позже.' });
  }
});

module.exports = imageBotRouter;
