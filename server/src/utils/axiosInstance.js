const axios = require('axios');
require('dotenv').config();

const instance = axios.create({
  baseURL: process.env.DOMAIN || 'https://1bdf-95-164-12-129.ngrok-free.app',
  headers: {
    'Content-Type': 'application/json',
  },
});

module.exports = instance;
