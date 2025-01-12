const Redis = require('ioredis');
const { UserModelRequest } = require('../../db/models');


const redis = new Redis({
  host: '127.0.0.1', 
  port: 6379,
  password: '0707',  
  db: 0,             
  showFriendlyErrorStack: true,
});

// Создаем отдельный клиент для подписок (истечение ключей)
 
const sub = new Redis({
  host: '127.0.0.1',
  port: 6379,
  password: '0707',
  db: 0,
  showFriendlyErrorStack: true,
});

// 📥 Получение данных из Redis по ключу
 
async function getCache(key) {
  try {
    const data = await redis.get(key);
    // Для отладки можно включить лог:
    // console.log(`[DEBUG] getCache(${key}) =>`, data ? data.slice(0, 80) : 'NULL');
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`❌ [cacheRedis] Ошибка getCache(${key}):`, error.message);
    return null;
  }
}

// 📤 Сохранение данных в Redis
 
async function setCache(key, value, ttl = 300) {
  try {
    const str = JSON.stringify(value);
    await redis.set(key, str, 'EX', ttl);
    // console.log(`[DEBUG] setCache(${key}): TTL=${ttl}, value=`, value);
    return true;
  } catch (error) {
    console.error(`❌ [cacheRedis] Ошибка setCache(${key}):`, error.message);
    return false;
  }
}

// 🗑 Удаление ключа
 
async function delCache(key) {
  try {
    const result = await redis.del(key);
    // console.log(`[DEBUG] delCache(${key}): result=${result}`);
    return result;
  } catch (error) {
    console.error(`❌ [cacheRedis] Ошибка delCache(${key}):`, error.message);
    return 0;
  }
}

// 🧹 Полная очистка (flush) Redis
 
async function flushAll() {
  try {
    await redis.flushall();
    console.log('🧹 [cacheRedis] FlushAll: кэш полностью очищен.');
  } catch (error) {
    console.error('❌ [cacheRedis] Ошибка при flushAll:', error.message);
  }
}

// 🔍 Проверка существования ключа
 
async function hasCache(key) {
  try {
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    console.error(`❌ [cacheRedis] Ошибка hasCache(${key}):`, error.message);
    return false;
  }
}

// ⏳ Узнать TTL ключа
 
async function getTTL(key) {
  try {
    const ttl = await redis.ttl(key);
    return ttl;
  } catch (error) {
    console.error(`❌ [cacheRedis] Ошибка getTTL(${key}):`, error.message);
    return -1;
  }
}

// 📊 Статистика Redis
 
async function logCacheStats() {
  try {
    const memoryInfo = await redis.info('memory');
    console.log('📊 [cacheRedis] Redis INFO:\n', memoryInfo);
  } catch (error) {
    console.error('❌ [cacheRedis] Ошибка при logCacheStats:', error.message);
  }
}

// 🚦 Закрыть соединения
 
async function closeConnection() {
  try {
    await redis.quit();
    await sub.quit();
    console.log('✅ [cacheRedis] Соединения с Redis закрыты.');
  } catch (error) {
    console.error('❌ [cacheRedis] Ошибка при closeConnection:', error.message);
  }
}

// 🛡️ Подписка на события истечения TTL
 
async function subscribeToExpirations() {
  try {
    // Пробуем активировать уведомления (Ex)
    try {
      await sub.config('SET', 'notify-keyspace-events', 'Ex');
      console.log('✅ [cacheRedis] notify-keyspace-events = Ex установлено.');
    } catch (err) {
      console.warn(`⚠️ [cacheRedis] Не удалось выполнить CONFIG SET: ${err.message}`);
    }

    // Подписываемся на канал истечения ключей
    sub.subscribe('__keyevent@0__:expired', (err, count) => {
      if (err) {
        console.error('❌ [cacheRedis] Ошибка при подписке expired:', err.message);
      } else {
        console.log(`🔔 [cacheRedis] Подписка на expired активна. Каналов: ${count}`);
      }
    });

    // Когда ключ истёк
    sub.on('message', async (channel, expiredKey) => {
      //console.log(`[DEBUG] [cacheRedis] Событие expired: ключ="${expiredKey}"`);

      // 1) Если это триггер-ключ
      if (expiredKey.startsWith('trigger_')) {
        const chatIdPart = expiredKey.replace('trigger_', '');
        const mainKey = `user_${chatIdPart}`;

        console.log(`[DEBUG] [cacheRedis] Триггер истёк. Попробуем прочитать ${mainKey}...`);

        const mainVal = await redis.get(mainKey);
        if (mainVal) {
          // Успели застать основной ключ
          console.log(`[DEBUG] [cacheRedis] mainKey="${mainKey}" ещё жив => делаем upsert в БД...`);
          try {
            const userCache = JSON.parse(mainVal);
            // Проверим, есть ли нужные поля
            if (userCache.userId && userCache.modelId !== undefined && userCache.requestCount !== undefined) {
              await UserModelRequest.upsert({
                user_id: userCache.userId,
                model_id: userCache.modelId,
                request_count: userCache.requestCount,
              }, {
                where: {
                  user_id: userCache.userId,
                  model_id: userCache.modelId,
                }
              });
              console.log(`[DEBUG] [cacheRedis] Синхронизация прошла успешно (mainKey="${mainKey}").`);
            } else {
              console.warn(`[WARN] [cacheRedis] mainKey="${mainKey}" не содержит нужных полей. Данные:`, userCache);
            }
          } catch (err) {
            console.error(`❌ [cacheRedis] Ошибка при upsert для "${mainKey}":`, err.message);
          }          
          // Можно сейчас сразу удалить mainKey, если хотим
          // await redis.del(mainKey);
        } else {
          console.log(`[DEBUG] [cacheRedis] mainKey="${mainKey}" уже нет (успел протухнуть?).`);
        }
      }

      // 2) Если истёк сам user_{...}, можно тоже что-то делать
      if (expiredKey.startsWith('user_')) {
        console.log(`[DEBUG] [cacheRedis] userKey="${expiredKey}" истёк окончательно.`);
      }
    });
  } catch (error) {
    console.error('❌ [cacheRedis] Ошибка при subscribeToExpirations():', error.message);
  }
}

/** Инициализируем подписку сразу при загрузке */
(async () => {
  await subscribeToExpirations();
})();

module.exports = {
  getCache,
  setCache,
  delCache,
  flushAll,
  hasCache,
  getTTL,
  logCacheStats,
  closeConnection,
};
