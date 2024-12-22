const NodeCache = require('node-cache');

//  кэш с временем жизни данных по умолчанию в 5 минут
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

/**
 * Получить данные из кэша
 * @param {string} key - Ключ кэша
 * @returns {*} - Данные из кэша или undefined
 */
function getCache(key) {
  return cache.get(key);
}

/**
 * Сохранить данные в кэше
 * @param {string} key - Ключ кэша
 * @param {*} value - Данные для сохранения
 * @param {number} ttl - Время жизни в секундах
 */
function setCache(key, value, ttl = 300) {
  cache.set(key, value, ttl);
}

/**
 * Удалить данные из кэша
 * @param {string} key - Ключ кэша
 */
function deleteCache(key) {
  cache.del(key);
}

/**
 * Получить все ключи из кэша
 * @returns {Array} - Список ключей
 */
function getAllKeys() {
  return cache.keys();
}

module.exports = {
  getCache,
  setCache,
  deleteCache,
  getAllKeys,
};
