const express = require('express');
const { register } = require('../metrics/prometheusMetrics');
const getSystemStats = require('../metrics/systemStats');

const metricsRouter = express.Router();

// Эндпоинт для метрик Prometheus
metricsRouter.route('/metrics').get(async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).send(`Ошибка при сборе метрик: ${error.message}`);
  }
});

// Эндпоинт для системных статусов
metricsRouter.route('/system-stats').get((req, res) => {
  const stats = getSystemStats();
  res.json(stats);
});

module.exports = metricsRouter;

//http://localhost:3000/api/metrics/metrics