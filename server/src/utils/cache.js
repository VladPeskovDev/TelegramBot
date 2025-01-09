const NodeCache = require('node-cache');
const { UserModelRequest } = require('../../db/models');

// Создаем экземпляр NodeCache с настройками
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

/**
 * Получение данных из кэша по ключу
 */
const getCache = (key) => {
  try {
    return cache.get(key);
  } catch (error) {
    console.error('❌ Ошибка при получении данных из кэша:', error.message);
    return null;
  }
};

/**
 * Сохранение данных в кэше
 */
const setCache = (key, value, ttl = 300) => {
  try {
    return cache.set(key, value, ttl);
  } catch (error) {
    console.error('❌ Ошибка при сохранении данных в кэше:', error.message);
    return false;
  }
};

/**
 * Удаление данных из кэша
 */
const delCache = (key) => {
  try {
    return cache.del(key);
  } catch (error) {
    console.error('❌ Ошибка при удалении данных из кэша:', error.message);
    return 0;
  }
};

/**
 * Полная очистка кэша
 */
const flushAll = () => {
  try {
    cache.flushAll();
    console.log('🧹 Кэш полностью очищен.');
  } catch (error) {
    console.error('❌ Ошибка при очистке кэша:', error.message);
  }
};

/**
 * Проверка существования ключа в кэше
 */
const hasCache = (key) => {
  try {
    return cache.has(key);
  } catch (error) {
    console.error('❌ Ошибка при проверке ключа в кэше:', error.message);
    return false;
  }
};

/**
 * Подписка на событие истечения TTL для принудительной синхронизации
 */
cache.on('expired', async (key, value) => {
  console.log(`🔄 Ключ ${key} истёк. Выполняем синхронизацию с БД...`);

  if (key.startsWith('user_') && value && value.userId && value.subscriptionId && value.modelId !== undefined) {
    try {
      value.syncing = true;
      await UserModelRequest.upsert({
        user_id: value.userId,
        subscription_id: value.subscriptionId,
        model_id: value.modelId,
        request_count: value.requestCount,
      }, {
        where: {
          user_id: value.userId,
          subscription_id: value.subscriptionId,
          model_id: value.modelId,
        }
      });
      console.log(`✅ Принудительная синхронизация для ключа ${key} завершена.`);
    } catch (error) {
      console.error(`❌ Ошибка при принудительной синхронизации для ключа ${key}:`, error.message);
    } finally {
      delCache(key);
      value.syncing = false;
    }
  } else {
    console.warn(`⚠️ Ключ ${key} не требует синхронизации с БД. Пропускаем.`);
  }
});


/**
 * Логирование текущего состояния кэша (для отладки)
 */
const logCacheStats = () => {
  console.log('📊 Статистика кэша:', cache.getStats());
};

module.exports = {
  getCache,
  setCache,
  delCache,
  flushAll,
  hasCache,
  logCacheStats,
};


/* 'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex('UserModelRequests', ['user_id', 'model_id'], {
      unique: true,
      name: 'user_model_unique'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('UserModelRequests', 'user_model_unique');
  }
};
*/