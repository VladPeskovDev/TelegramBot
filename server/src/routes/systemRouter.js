const express = require('express');
const getSystemStats = require('../utils/systemStats');

const router = express.Router();

// Эндпоинт для получения статистики системы
router.get('/system-stats', (req, res) => {
    const stats = getSystemStats();
    res.json(stats);
});

module.exports = router;


//http://localhost:3000/api/system-stats