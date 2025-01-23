const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const loggerWinston = require('./loggerWinston');


const logDir = path.join(__dirname, '../../logs');
const logFile = path.join(logDir, 'access.log');


if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Функция для создания потока записи логов
function createLogStream() {
  return fs.createWriteStream(logFile, { flags: 'a' });
}

// Изначально создаём поток логирования
let logStream = createLogStream();

// Конфигурация логирования
let logger = morgan('combined', { stream: logStream });


cron.schedule('35 00 * * *', () => {
  if (fs.existsSync(logFile)) {
    // Закрываем текущий поток перед удалением файла
    logStream.end(() => {
      fs.unlink(logFile, (err) => {
        if (err) {
          loggerWinston.error('❌ Ошибка при удалении файла логов:', err);
        } else {
          loggerWinston.info('✅ Файл логов успешно удалён.');

          // Пересоздаём поток логирования и обновляем Morgan middleware
          logStream = createLogStream();
          logger = morgan('combined', { stream: logStream });
          loggerWinston.info('✅ Поток логирования успешно пересоздан.');
        }
      });
    });
  } else {
    loggerWinston.info('⚠️ Файл логов не найден для удаления.');
  }
});

module.exports = (req, res, next) => {
  logger(req, res, next);
}; 
