const { 
  requestCounter, 
  activeUsersGauge, 
  responseTimeHistogram, 
  totalUsersGauge, 
  dailyUsersGauge, 
  updateMaxOnline 
} = require('./prometheusMetrics');
const cron = require('node-cron');

// Храним активных пользователей
const activeUsers = new Set();
const dailyUsers = new Set();

// Устанавливаем cron-задачу на сброс метрик ежедневных пользователей
cron.schedule('1 0 * * *', () => {
  console.log('Сброс метрик: bot_daily_users и bot_total_users');
  
  // Сбрасываем метрику уникальных пользователей за сутки
  dailyUsersGauge.set(0);
  dailyUsers.clear();

  // Сбрасываем общее количество пользователей за сутки
  totalUsersGauge.set(0);
});

module.exports = (bot) => {
  bot.on('message', async (msg) => {
    const chatId = String(msg.chat.id);
    const startTime = Date.now();

    // Добавляем пользователя в список активных
    if (!activeUsers.has(chatId)) {
      activeUsers.add(chatId);
      activeUsersGauge.set(activeUsers.size);
    }

    // Добавляем пользователя в список уникальных за сутки
    if (!dailyUsers.has(chatId)) {
      dailyUsers.add(chatId);
      dailyUsersGauge.set(dailyUsers.size);
    }

    // Увеличиваем метрику общего числа пользователей за сутки
    totalUsersGauge.inc();

    // Обновляем максимальный онлайн
    updateMaxOnline(activeUsers.size);

    try {
      // Логика обработки сообщений
      requestCounter.inc({ endpoint: 'message' });
    } finally {
      // Удаляем пользователя из списка активных через 10 секунд
      setTimeout(() => {
        activeUsers.delete(chatId);
        activeUsersGauge.set(activeUsers.size);
      }, 10000);

      // Логируем время обработки
      const responseTime = (Date.now() - startTime) / 1000;
      responseTimeHistogram.observe({ endpoint: 'message' }, responseTime);
    }
  });

  bot.on('callback_query', async (callbackQuery) => {
    // eslint-disable-next-line no-unused-vars
    const chatId = String(callbackQuery.message.chat.id);
    const startTime = Date.now();

    // Логика обработки callback-запросов
    try {
      requestCounter.inc({ endpoint: 'callback_query' });
    } finally {
      const responseTime = (Date.now() - startTime) / 1000;
      responseTimeHistogram.observe({ endpoint: 'callback_query' }, responseTime);
    }
  });
};
