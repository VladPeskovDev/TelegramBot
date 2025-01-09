const client = require('prom-client');

// Регистр метрик
const register = new client.Registry();

// Настраиваем метрики
const requestCounter = new client.Counter({
  name: 'bot_requests_total',
  help: 'Общее количество запросов к боту',
  labelNames: ['endpoint'], 
});

const activeUsersGauge = new client.Gauge({
  name: 'bot_active_users',
  help: 'Текущее количество активных пользователей',
});

const responseTimeHistogram = new client.Histogram({
  name: 'bot_response_time_seconds',
  help: 'Гистограмма времени ответа бота в секундах',
  labelNames: ['endpoint'], 
  buckets: [0.1, 0.3, 0.5, 1, 1.5, 2, 5], // Временные интервалы
});

const totalUsersGauge = new client.Gauge({
  name: 'bot_total_users',
  help: 'Количество пользователей за сутки', // Изменяем описание
});

const maxOnlineGauge = new client.Gauge({
  name: 'bot_max_online_users',
  help: 'Максимальный онлайн пользователей',
});

const dailyUsersGauge = new client.Gauge({
  name: 'bot_daily_users',
  help: 'Количество уникальных пользователей за сутки',
});

// Переменная для хранения текущего максимального онлайна
let maxOnlineUsers = 0;

// Обновляем метрику максимального онлайна
function updateMaxOnline(currentOnline) {
  if (currentOnline > maxOnlineUsers) {
    maxOnlineUsers = currentOnline;
    maxOnlineGauge.set(maxOnlineUsers); // Обновляем значение в метрике
  }
}

// Регистрируем метрики
register.registerMetric(requestCounter);
register.registerMetric(activeUsersGauge);
register.registerMetric(responseTimeHistogram);
register.registerMetric(totalUsersGauge);
register.registerMetric(maxOnlineGauge);
register.registerMetric(dailyUsersGauge);

// Экспортируем метрики и регистр
module.exports = {
  requestCounter,
  activeUsersGauge,
  responseTimeHistogram,
  totalUsersGauge,
  maxOnlineGauge,
  dailyUsersGauge,
  updateMaxOnline,
  register,
};
