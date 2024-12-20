const axios = require('axios');
require('dotenv').config();

const instance = axios.create({
  baseURL: process.env.API_BASE_URL || 'https://4e6b-95-164-12-129.ngrok-free.app',
  headers: {
    'Content-Type': 'application/json',
  },
});

module.exports = instance;
