const axios = require('axios');
require('dotenv').config();

const instance = axios.create({
  baseURL: process.env.DOMAIN || 'https://tgqueue.ru',
  headers: {
    'Content-Type': 'application/json',
  },
});

module.exports = instance;
