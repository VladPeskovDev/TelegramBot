const express = require('express');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const bot = require('./bot');
const openaiRouter = require('./routes/openaiRouter');
const accountRouter = require('./routes/accountRouter');
const openaiO1Router = require('./routes/openaiO1Router');
const cron = require('node-cron');
const { subscription } = require('./utils/subscriptionCron');


const app = express();

app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use('/api/openai', openaiRouter);
app.use('/api/account', accountRouter);
app.use('/api/openaiO1', openaiO1Router);


cron.schedule('56 18 * * *', subscription);



// WebHook для Telegram
app.post(`/bot${process.env.TELEGRAM_BOT_TOKEN}`, (req, res) => {
    bot.processUpdate(req.body); // Передаем данные в бота
    res.sendStatus(200); // Уведомляем Telegram, что запрос обработан
  });

module.exports = app;
