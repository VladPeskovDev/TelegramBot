const express = require('express');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const bot = require('./bot');
const openaiRouter = require('./routes/openaiRouter');
const accountRouter = require('./routes/accountRouter');
const cron = require('node-cron');
const { subscription } = require('./utils/subscriptionCron');

const app = express();

app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use('/api/openai', openaiRouter);
app.use('/api/account', accountRouter);


cron.schedule('25 13 * * *', subscription);
console.log('🟢 Cron Job для подписок и лимитов активирован');



// WebHook для Telegram
app.post(`/bot${process.env.TELEGRAM_BOT_TOKEN}`, (req, res) => {
    bot.processUpdate(req.body); // Передаем данные в бота
    res.sendStatus(200); // Уведомляем Telegram, что запрос обработан
  });

module.exports = app;
