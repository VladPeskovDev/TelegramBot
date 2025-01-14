require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const setupStartCommand = require('./commands/start');
const setupInfoCommand = require('./commands/info');
const setupHelpCommand = require('./commands/help');
const setupSubscriptionCommand = require('./commands/subscription');
const setupAccountCommand = require('./commands/account');
const setupModelCommand = require('./commands/model');
const { handleFeedbackCommand } = require('./commands/feedback');
const { handleResetCommand } = require('./commands/reset');
const setupTermsCommand = require('./commands/terms');
const integratePrometheusMetrics = require('./metrics/prometheusIntegration');


const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { webHook: true });

// Устанавливаем WebHook
const WEBHOOK_URL = `${process.env.DOMAIN}/bot${process.env.TELEGRAM_BOT_TOKEN}`;
bot.setWebHook(WEBHOOK_URL)
  .then(() => console.log(`Webhook установлен: ${WEBHOOK_URL}`))
  .catch((err) => console.error('Ошибка при установке Webhook:', err));

// Устанавливаем команды
bot.setMyCommands([
  { command: '/start', description: '🚀 Начать взаимодействие с ботом' },
  { command: '/help', description: '❓ Помощь по использованию бота' },
  { command: '/model', description: '🛠 Выбрать модель' },
  { command: '/subscription', description: '💳 Приобрести подписку' },
  { command: '/account', description: '👤 Получить информацию о вашем аккаунте' },
  { command: '/info', description: 'ℹ️ Получить информацию о боте' },
  { command: '/feedback', description: '✉️ Связаться с нами' },
  { command: '/reset', description: '🗑️ Сбросить контекст диалога' },
  {command: '/terms', description: '📜 Правила подписки и условия использования'}
]);

// Подключаем команды
setupStartCommand(bot);
setupInfoCommand(bot);
setupHelpCommand(bot);
setupSubscriptionCommand(bot);
setupAccountCommand(bot);
setupModelCommand(bot);
handleFeedbackCommand(bot);
handleResetCommand(bot);
setupTermsCommand(bot);
integratePrometheusMetrics(bot);


console.log('Бот настроен для работы с WebHook.');

module.exports = bot;




//ngrok http 3000