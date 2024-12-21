const express = require('express');
const { User, UserSubscription, UserModelRequest, Subscription, SubscriptionModelLimit } = require('../../db/models'); 
const openai = require('../utils/openai');
const openaiRouter = express.Router();
require('dotenv').config();


openaiRouter.route('/model_gpt-4o-mini').post(async (req, res) => {
  const { chatId, userMessage } = req.body;

  if (!userMessage) {
    return res.status(400).json({ error: 'Сообщение не может быть пустым.' });
  }

  try {
    const gptModelId = 3; 
    const modelName = 'gpt-4o-mini';

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
      order: [['end_date', 'DESC']],
    });

    if (!activeSubscription || new Date(activeSubscription.end_date) < new Date()) {
      return res.status(403).json({
        error: 'У вас нет активной подписки. Пожалуйста, оформите подписку.',
      });
    }

    // Проверяем лимит запросов для подписки
    const subscriptionLimit = await SubscriptionModelLimit.findOne({
      where: {
        subscription_id: activeSubscription.subscription_id,
        model_id: gptModelId,
      },
    });

    if (!subscriptionLimit) {
      return res.status(400).json({ error: 'Лимиты для данной подписки и модели не найдены.' });
    }

    // Проверяем текущий счётчик запросов
    const userModelRequest = await UserModelRequest.findOne({
      where: {
        user_id: user.id,
        subscription_id: activeSubscription.id,
        model_id: gptModelId,
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
        model_id: gptModelId,
        request_count: 1,
      });
    }

    // Отправляем запрос в OpenAI
    const response = await openai.chat.completions.create({
      model: modelName, 
      messages: [{ role: 'user', content: userMessage }],
      max_tokens: 1250,
      temperature: 0.7,
    });


    if (!response.choices || !response.choices[0] || !response.choices[0].message) {
      throw new Error('Некорректный ответ от OpenAI');
    }

    
    let botResponse = response.choices[0].message.content.trim();
    botResponse = botResponse.replace(/```[a-zA-Z]*\n([\s\S]*?)```/g, (match, code) => {
      return `\`\`\`\n${code.trim()}\n\`\`\``;
    });

    res.json({ reply: botResponse });
  } catch (error) {
    console.error('Ошибка при обработке сообщения:', error.message);
    if (error.stack) console.error(error.stack);
    res.status(500).json({ error: 'Ошибка на сервере. Попробуйте позже.' });
  }
});


//------------------>следующий endpoint<----------------

openaiRouter.route('/model4').post(async (req, res) => {
  const { chatId, userMessage } = req.body;

  if (!userMessage) {
    return res.status(400).json({ error: 'Сообщение не может быть пустым.' });
  }

  try {
    const gptModelId = 2; 
    const modelName = 'gpt-4o';

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
      order: [['end_date', 'DESC']],
    });

    if (!activeSubscription || new Date(activeSubscription.end_date) < new Date()) {
      return res.status(403).json({
        error: 'У вас нет активной подписки. Пожалуйста, оформите подписку.',
      });
    }

    // Проверяем лимит запросов для подписки
    const subscriptionLimit = await SubscriptionModelLimit.findOne({
      where: {
        subscription_id: activeSubscription.subscription_id,
        model_id: gptModelId,
      },
    });

    if (!subscriptionLimit) {
      return res.status(400).json({ error: 'Лимиты для данной подписки и модели не найдены.' });
    }

    // Проверяем текущий счётчик запросов
    const userModelRequest = await UserModelRequest.findOne({
      where: {
        user_id: user.id,
        subscription_id: activeSubscription.id,
        model_id: gptModelId,
      },
    });

    const currentRequestCount = userModelRequest ? userModelRequest.request_count : 0;

    if (currentRequestCount >= subscriptionLimit.requests_limit) {
      return res.status(403).json({
        error: `Вы исчерпали лимит запросов в количестве 3 штук для модели ${modelName}. Рекомендуем Вам приобрести подписку на 1 месяц. Для этого введите команду /subscription.`,
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
        model_id: gptModelId,
        request_count: 1,
      });
    }

    // Отправляем запрос в OpenAI
    const response = await openai.chat.completions.create({
      model: modelName, 
      messages: [{ role: 'user', content: userMessage }],
      max_tokens: 1000,
      temperature: 0.7,
    });

    if (!response.choices || !response.choices[0] || !response.choices[0].message) {
      throw new Error('Некорректный ответ от OpenAI');
    }

    
    let botResponse = response.choices[0].message.content.trim();
    botResponse = botResponse.replace(/```[a-zA-Z]*\n([\s\S]*?)```/g, (match, code) => {
      return `\`\`\`\n${code.trim()}\n\`\`\``;
    });

    res.json({ reply: botResponse });
  } catch (error) {
    console.error('Ошибка при обработке сообщения:', error.message);
    if (error.stack) console.error(error.stack);
    res.status(500).json({ error: 'Ошибка на сервере. Попробуйте позже.' });
  }
});

//------------------>следующий endpoint<----------------

openaiRouter.route('/model3.5').post(async (req, res) => {
  const { chatId, userMessage } = req.body;

  if (!userMessage) {
    return res.status(400).json({ error: 'Сообщение не может быть пустым.' });
  }

  try {
    const gptModelId = 1; 
    const modelName = 'gpt-3.5-turbo';

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
      order: [['end_date', 'DESC']],
    });

    if (!activeSubscription || new Date(activeSubscription.end_date) < new Date()) {
      return res.status(403).json({
        error: 'У вас нет активной подписки. Пожалуйста, оформите подписку.',
      });
    }

    // Проверяем лимит запросов для подписки
    const subscriptionLimit = await SubscriptionModelLimit.findOne({
      where: {
        subscription_id: activeSubscription.subscription_id,
        model_id: gptModelId,
      },
    });

    if (!subscriptionLimit) {
      return res.status(400).json({ error: 'Лимиты для данной подписки и модели не найдены.' });
    }

    // Проверяем текущий счётчик запросов
    const userModelRequest = await UserModelRequest.findOne({
      where: {
        user_id: user.id,
        subscription_id: activeSubscription.id,
        model_id: gptModelId,
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
        model_id: gptModelId,
        request_count: 1,
      });
    }

    // Отправляем запрос в OpenAI
    const response = await openai.chat.completions.create({
      model: modelName, 
      messages: [{ role: 'user', content: userMessage }],
      max_tokens: 1500,
      temperature: 0.7,
    });

    if (!response.choices || !response.choices[0] || !response.choices[0].message) {
      throw new Error('Некорректный ответ от OpenAI');
    }

    
    let botResponse = response.choices[0].message.content.trim();
    botResponse = botResponse.replace(/```[a-zA-Z]*\n([\s\S]*?)```/g, (match, code) => {
      return `\`\`\`\n${code.trim()}\n\`\`\``;
    });

    res.json({ reply: botResponse });
  } catch (error) {
    console.error('Ошибка при обработке сообщения:', error.message);
    if (error.stack) console.error(error.stack);
    res.status(500).json({ error: 'Ошибка на сервере. Попробуйте позже.' });
  }
});


module.exports = openaiRouter;



//model: 'gpt-4o-mini-2024-07-18', /
//router.post('/', async (req, res) => {