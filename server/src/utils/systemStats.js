const os = require('os');

const getSystemStats = () => ({
    freeMemory: os.freemem(),
    totalMemory: os.totalmem(),
    cpuLoad: os.loadavg(),
    uptime: os.uptime()
});

module.exports = getSystemStats;
