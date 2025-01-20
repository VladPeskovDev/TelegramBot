const { requestCounter, activeUsersGauge, responseTimeHistogram, totalUsersGauge, dailyUsersGauge,  updateMaxOnline 
} = require('./prometheusMetrics');
const loggerWinston = require('./loggerWinston'); 
const cron = require('node-cron');

// Храним активных пользователей
const activeUsers = new Map(); 
const dailyUsers = new Set();

// Устанавливаем cron-задачу на сброс метрик ежедневных пользователей
cron.schedule('30 00 * * *', () => {
  loggerWinston.info('🕒 [CRON JOB] Сброс метрик: bot_daily_users и bot_total_users');
  
  // Сбрасываем метрику уникальных пользователей за сутки
  dailyUsersGauge.set(0);
  dailyUsers.clear();
  loggerWinston.info('✅ Метрика bot_daily_users сброшена.');

  // Сбрасываем общее количество пользователей за сутки
  totalUsersGauge.set(0);
  loggerWinston.info('✅ Метрика bot_total_users сброшена.');
});

// Удаление неактивных пользователей каждые 10 секунд
setInterval(() => {
  const now = Date.now();
  let usersRemoved = 0;

  activeUsers.forEach((lastActivity, chatId) => {
    if (now - lastActivity > 10000) { // 10 секунд с последней активности
      activeUsers.delete(chatId);
      usersRemoved++;
    }
  });

  // Обновляем метрику активных пользователей
  activeUsersGauge.set(activeUsers.size);

  // Логируем удаление пользователей
  if (usersRemoved > 0) {
    //loggerWinston.info(`❌ ${usersRemoved} пользователь(-я/-ей) удалено из активных.`);
  }
}, 10000);

module.exports = (bot) => {
  bot.on('message', async (msg) => {
    const chatId = String(msg.chat.id);
    const startTime = Date.now();

    // Добавляем или обновляем активного пользователя
    activeUsers.set(chatId, startTime);
    activeUsersGauge.set(activeUsers.size); // Обновляем Gauge

    // Логируем добавление активного пользователя
    //loggerWinston.info(`👤 Пользователь ${chatId} добавлен или обновлён в активных.`);

    // Добавляем пользователя в список уникальных за сутки
    if (!dailyUsers.has(chatId)) {
      dailyUsers.add(chatId);
      dailyUsersGauge.set(dailyUsers.size); // Обновляем Gauge
      //loggerWinston.info(`📅 Уникальный пользователь за сутки: ${chatId}`);
    }

    // Увеличиваем метрику общего числа пользователей за сутки
    totalUsersGauge.inc();
    //loggerWinston.info('📊 Общая метрика bot_total_users увеличена.');

    // Обновляем максимальный онлайн
    updateMaxOnline(activeUsers.size); // Передаём корректное значение
    

    try {
      // Логика обработки сообщений
      requestCounter.inc({ endpoint: 'message' });
    } finally {
      // Логируем время обработки
      const responseTime = (Date.now() - startTime) / 1000;
      responseTimeHistogram.observe({ endpoint: 'message' }, responseTime);
      //loggerWinston.info(`⏳ Время обработки сообщения: ${responseTime} сек.`);
    }
  });

  bot.on('callback_query', async (callbackQuery) => {
    // eslint-disable-next-line no-unused-vars
    const chatId = String(callbackQuery.message.chat.id);
    const startTime = Date.now();

    // Логика обработки callback-запросов
    try {
      requestCounter.inc({ endpoint: 'callback_query' });
      //loggerWinston.info(`📥 Callback запрос обработан для пользователя: ${chatId}`);
    } finally {
      const responseTime = (Date.now() - startTime) / 1000;
      responseTimeHistogram.observe({ endpoint: 'callback_query' }, responseTime);
      //loggerWinston.info(`⏳ Время обработки callback запроса: ${responseTime} сек.`);
    }
  });
};









/* const { requestCounter, activeUsersGauge, responseTimeHistogram, totalUsersGauge, dailyUsersGauge, updateMaxOnline } = require('./prometheusMetrics');
const cron = require('node-cron');

// Храним активных пользователей
const activeUsers = new Set();
const dailyUsers = new Set();

// Устанавливаем cron-задачу на сброс метрик ежедневных пользователей
cron.schedule('7 21 * * *', () => {
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
*/
/* const { requestCounter, activeUsersGauge, responseTimeHistogram,  totalUsersGauge,  dailyUsersGauge, updateMaxOnline } = require('./prometheusMetrics');
const cron = require('node-cron');
const loggerWinston = require('../utils/loggerWinston'); 

// Храним активных пользователей
const activeUsers = new Set();
const dailyUsers = new Set();

// Устанавливаем cron-задачу на сброс метрик ежедневных пользователей
cron.schedule('14 21 * * *', () => {
  loggerWinston.info('🕒 [CRON JOB] Сброс метрик: bot_daily_users и bot_total_users');
  
  // Сбрасываем метрику уникальных пользователей за сутки
  dailyUsersGauge.set(0);
  dailyUsers.clear();
  loggerWinston.info('✅ Метрика bot_daily_users сброшена.');

  // Сбрасываем общее количество пользователей за сутки
  totalUsersGauge.set(0);
  loggerWinston.info('✅ Метрика bot_total_users сброшена.');
});

module.exports = (bot) => {
  bot.on('message', async (msg) => {
    const chatId = String(msg.chat.id);
    const startTime = Date.now();

    // Добавляем пользователя в список активных
    if (!activeUsers.has(chatId)) {
      activeUsers.add(chatId);
      activeUsersGauge.set(activeUsers.size);
      //loggerWinston.info(`👤 Добавлен активный пользователь: ${chatId}`);
    }

    // Добавляем пользователя в список уникальных за сутки
    if (!dailyUsers.has(chatId)) {
      dailyUsers.add(chatId);
      dailyUsersGauge.set(dailyUsers.size);
      //loggerWinston.info(`📅 Уникальный пользователь за сутки: ${chatId}`);
    }

    // Увеличиваем метрику общего числа пользователей за сутки
    totalUsersGauge.inc();
    //loggerWinston.info('📊 Общая метрика bot_total_users увеличена.');

    // Обновляем максимальный онлайн
    updateMaxOnline(activeUsers.size);
    loggerWinston.info(`📈 Обновлен максимальный онлайн: ${activeUsers.size}`);

    try {
      // Логика обработки сообщений
      requestCounter.inc({ endpoint: 'message' });
    } finally {
      // Удаляем пользователя из списка активных через 10 секунд
      setTimeout(() => {
        activeUsers.delete(chatId);
        activeUsersGauge.set(activeUsers.size);
        //loggerWinston.info(`❌ Пользователь ${chatId} удалён из активных.`);
      }, 10000);

      // Логируем время обработки
      const responseTime = (Date.now() - startTime) / 1000;
      responseTimeHistogram.observe({ endpoint: 'message' }, responseTime);
      //loggerWinston.info(`⏳ Время обработки сообщения: ${responseTime} сек.`);
    }
  });

  bot.on('callback_query', async (callbackQuery) => {
    // eslint-disable-next-line no-unused-vars
    const chatId = String(callbackQuery.message.chat.id);
    const startTime = Date.now();

    // Логика обработки callback-запросов
    try {
      requestCounter.inc({ endpoint: 'callback_query' });
      //loggerWinston.info(`📥 Callback запрос обработан для пользователя: ${chatId}`);
    } finally {
      const responseTime = (Date.now() - startTime) / 1000;
      responseTimeHistogram.observe({ endpoint: 'callback_query' }, responseTime);
      //loggerWinston.info(`⏳ Время обработки callback запроса: ${responseTime} сек.`);
    }
  });
};
*/