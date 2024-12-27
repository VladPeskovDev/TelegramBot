const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// Создание потока для записи логов в файл
const logStream = fs.createWriteStream(path.join(__dirname, '../logs/access.log'), {
    flags: 'a' 
});

// Конфигурация логирования
const logger = morgan('combined', { stream: logStream });

module.exports = logger;
