const express = require('express');
const { User, UserSubscription, UserModelRequest, GPTModel, Subscription, SubscriptionModelLimit } = require('../../db/models'); 
const openai = require('../utils/openai');
const openaiRouter = express.Router();
require('dotenv').config();

openaiRouter.route('/').post(async (req, res) => {
  const { chatId, userMessage, modelName } = req.body;

  if (!userMessage) {
    return res.status(400).json({ error: 'Сообщение не может быть пустым.' });
  }

  try {
    // Проверяем регистрацию пользователя
    const user = await User.findOne({ where: { telegram_id: chatId } });
    if (!user) {
      return res.status(403).json({
        error: 'Вы не зарегистрированы. Пожалуйста, используйте команду /start для регистрации.',
      });
    }

    // Проверяем активную подписку пользователя
    const activeSubscription = await UserSubscription.findOne({
      where: { user_id: user.id },
      include: [{ model: Subscription, as: 'subscription' }],
      order: [['end_date', 'DESC']], // Берём самую последнюю активную подписку
    });

    if (!activeSubscription || new Date(activeSubscription.end_date) < new Date()) {
      return res.status(403).json({
        error: 'У вас нет активной подписки. Пожалуйста, оформите подписку.',
      });
    }

    // Проверяем модель GPT
    const gptModel = await GPTModel.findOne({ where: { name: modelName } });
    if (!gptModel) {
      return res.status(400).json({ error: 'Модель GPT не найдена.' });
    }

    // Проверяем лимит запросов для данной подписки и модели
    const subscriptionLimit = await SubscriptionModelLimit.findOne({
      where: {
        subscription_id: activeSubscription.subscription_id,
        model_id: gptModel.id,
      },
    });

    if (!subscriptionLimit) {
      return res.status(400).json({ error: 'Лимиты для данной подписки и модели не найдены.' });
    }

    const userModelRequest = await UserModelRequest.findOne({
      where: {
        user_id: user.id,
        subscription_id: activeSubscription.id,
        model_id: gptModel.id,
      },
    });

    const currentRequestCount = userModelRequest ? userModelRequest.request_count : 0;

    if (currentRequestCount >= subscriptionLimit.requests_limit) {
      return res.status(403).json({
        error: `Вы исчерпали лимит запросов (${subscriptionLimit.requests_limit}) для модели ${modelName}.`,
      });
    }

    // Увеличиваем счётчик запросов
    if (userModelRequest) {
      userModelRequest.request_count += 1;
      await userModelRequest.save();
    } else {
      await UserModelRequest.create({
        user_id: user.id,
        subscription_id: activeSubscription.id,
        model_id: gptModel.id,
        request_count: 1,
      });
    }

    // Отправляем запрос в OpenAI
    const response = await openai.chat.completions.create({
      model: modelName,
      messages: [{ role: 'user', content: userMessage }],
      max_tokens: 500,
      temperature: 0.7,
    });

    let botResponse = response.choices[0].message.content.trim();

    botResponse = botResponse.replace(/```[a-zA-Z]*\n([\s\S]*?)```/g, (match, code) => {
      return `\`\`\`\n${code.trim()}\n\`\`\``;
    }); 

    // Возвращаем ответ
    res.json({ reply: botResponse });
  } catch (error) {
    console.error('Ошибка при обработке сообщения:', error);
    res.status(500).json({ error: 'Ошибка на сервере. Попробуйте позже.' });
  }
});

module.exports = openaiRouter;



//model: 'gpt-4o-mini-2024-07-18', /
//router.post('/', async (req, res) => {