const express = require('express');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const bot = require('./bot');
const openaiRouter = require('./routes/openaiRouter');

const app = express();



app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use('/api/openai', openaiRouter);

module.exports = app;
