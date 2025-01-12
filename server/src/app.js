const express = require('express');
const morgan = require('morgan');
const bot = require('./bot');
const openaiRouter = require('./routes/openaiRouter');
const accountRouter = require('./routes/accountRouter');
const openaiO1Router = require('./routes/openaiO1Router');
const metricsRouter = require('./routes/metricsRouter');
const cron = require('node-cron');
const { subscription } = require('./utils/subscriptionCron');
const logger = require('./metrics/logger');

const app = express();

app.use(logger);
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


app.use('/api/openai', openaiRouter);
app.use('/api/account', accountRouter);
app.use('/api/openaiO1', openaiO1Router);
app.use('/api/metrics', metricsRouter);

cron.schedule('06 21 * * *', subscription); //15:00


// WebHook 
app.post(`/bot${process.env.TELEGRAM_BOT_TOKEN}`, (req, res) => {
    bot.processUpdate(req.body); 
    res.sendStatus(200); 
  });

  
module.exports = app;
