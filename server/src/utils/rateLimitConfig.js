const rateLimit = require('express-rate-limit');


const userRateLimiter = rateLimit({
  windowMs: 4000, // 4 секунды
  max: 1,         //  только 1 запрос за окно (1 сек)
  keyGenerator: (req) => {
  const key = req.body.chatId || req.ip;
  return key;
  },
  handler: (req, res) => {
    return res.status(429).json({
      error: 'Слишком много запросов. Попробуйте снова через 1 секунду.',
    });
  },
  standardHeaders: true, 
  legacyHeaders: false,  
});

module.exports = userRateLimiter;