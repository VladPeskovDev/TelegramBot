const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const loggerWinston = require('../utils/loggerWinston');

// Директория и имя файла для логов
const logDir = path.join(__dirname, '../../logs');
const logFile = path.join(logDir, 'access.log');

// Убедитесь, что директория для логов существует
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

// Cron-задача для удаления файла логов каждые 24 часа
cron.schedule('31 22 * * *', () => {
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

// Middleware для экспорта (чтобы обновлённый logger всегда использовался)
module.exports = (req, res, next) => {
  logger(req, res, next);
};
