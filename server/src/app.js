const express = require('express');
const morgan = require('morgan');
const bot = require('./bot');
const openaiRouter = require('./routes/openaiRouter');
const accountRouter = require('./routes/accountRouter');
const openaiO1Router = require('./routes/openaiO1Router');
const metricsRouter = require('./routes/metricsRouter');
const cron = require('node-cron');
const { subscription } = require('./utils/subscriptionCron');
const paymentRouter = require('./routes/paymentRouter');
const imageBotRouter = require('./routes/imageBotRouter');
const audioBotRouter = require('./routes/audioBotRouter');
//const logger = require('./metrics/logger');

const app = express();

//app.use(logger);
app.use(morgan('dev'));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json({ limit: '50mb' }));


app.use('/api/openai', openaiRouter);
app.use('/api/account', accountRouter);
app.use('/api/openaiO1', openaiO1Router);
app.use('/api/metrics', metricsRouter);
app.use('/api/robokassa', paymentRouter);
app.use('/api/imagebot', imageBotRouter);
app.use('/api/audiobot', audioBotRouter);

cron.schedule('31 0,1,12 * * *', subscription); //33:00 (запуск в 03:31, 04:31, 15:31)


// WebHook 
app.post(`/bot${process.env.TELEGRAM_BOT_TOKEN}`, (req, res) => {
    bot.processUpdate(req.body); 
    res.sendStatus(200); 
  });

  
module.exports = app;
