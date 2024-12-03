const express = require('express');
const { User, UserStatistics } = require('../db/models'); // Модели базы данных
const openai = require('../utils/openai'); 
const openaiRouter = express.Router();
require('dotenv').config();


//router.post('/', async (req, res) => {
openaiRouter.route('/').post(async (req, res) => {
  const { chatId, userMessage } = req.body;

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

    // Проверяем лимит запросов
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
    const [stats] = await UserStatistics.findOrCreate({
      where: { user_id: user.id, month: currentMonth },
      defaults: { request_count: 0 },
    });

    if (stats.request_count >= user.subscription.requests_limit) {
      return res.status(403).json({
        error: 'Вы исчерпали лимит запросов на этот месяц. Пожалуйста, обновите подписку.',
      });
    }

    // Увеличиваем счетчик запросов
    stats.request_count += 1;
    await stats.save();

    // Отправляем запрос к OpenAI
    const response = await openai.createCompletion({
      model: 'gpt-4o-mini-2024-07-18', // Или другая модель
      prompt: userMessage,
      max_tokens: 100,
      temperature: 0.7,
    });

    const botResponse = response.data.choices[0].text.trim();

    // Возвращаем ответ
    res.json({ reply: botResponse });
  } catch (error) {
    console.error('Ошибка при обработке сообщения:', error);
    res.status(500).json({ error: 'Ошибка на сервере. Попробуйте позже.' });
  }
});

module.exports = openaiRouter;
