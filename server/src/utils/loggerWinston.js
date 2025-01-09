const { createLogger, format, transports } = require('winston');

const loggerWinston = createLogger({
  level: 'info', // Уровень логирования: info, warn, error
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}]: ${message}`)
  ),
  transports: [
    new transports.Console(), // Логирование в консоль
    new transports.File({ filename: 'logs/app.log' }), // Логирование в файл
  ],
});

module.exports = loggerWinston;
