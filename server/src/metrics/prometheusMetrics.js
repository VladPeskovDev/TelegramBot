const client = require('prom-client');
//const loggerWinston = require('./loggerWinston'); 


const register = new client.Registry();

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
  help: 'Количество пользователей за сутки', 
});

const maxOnlineGauge = new client.Gauge({
  name: 'bot_max_online_users',
  help: 'Максимальный онлайн пользователей',
});

const dailyUsersGauge = new client.Gauge({
  name: 'bot_daily_users',
  help: 'Количество уникальных пользователей за сутки',
});

// Переменная для  текущего макс онлайна
let maxOnlineUsers = 0;

// метрика макс онлайна
function updateMaxOnline(currentOnline) {
  if (currentOnline > maxOnlineUsers) {
    maxOnlineUsers = currentOnline;
    maxOnlineGauge.set(maxOnlineUsers); 
    //loggerWinston.info(`📈 Обновлен максимальный онлайн: ${maxOnlineUsers}`);
  }
}


register.registerMetric(requestCounter);
register.registerMetric(activeUsersGauge);
register.registerMetric(responseTimeHistogram);
register.registerMetric(totalUsersGauge);
register.registerMetric(maxOnlineGauge);
register.registerMetric(dailyUsersGauge);


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
