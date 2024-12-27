const os = require('os');

// Функция для сбора статистики системы
const getSystemStats = () => ({
    freeMemory: os.freemem(),
    totalMemory: os.totalmem(),
    cpuLoad: os.loadavg(),
    uptime: os.uptime()
});

module.exports = getSystemStats;
