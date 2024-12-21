const axios = require('axios');
require('dotenv').config();

const instance = axios.create({
  baseURL: process.env.API_BASE_URL || 'https://0a60-5-228-82-124.ngrok-free.app',
  headers: {
    'Content-Type': 'application/json',
  },
});

module.exports = instance;
