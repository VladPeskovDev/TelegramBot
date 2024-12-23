/* const { sequelize } = require('../db/models'); // Убедись, что путь к sequelize верный

(async () => {
  try {
    const [results, metadata] = await sequelize.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'UserModelRequests';
    `);

    console.log('📊 Индексы для таблицы UserModelRequests:');
    console.table(results);
    console.log(results);
  } catch (error) {
    console.error('❌ Ошибка при выполнении SQL-запроса:', error.message);
  } finally {
    await sequelize.close();
  }
})(); */ 

const { UserModelRequest } = require('../db/models'); // Убедись, что путь к модели правильный
const { Sequelize } = require('sequelize');

async function findDuplicates() {
  try {
    const duplicates = await UserModelRequest.findAll({
      attributes: [
        'user_id',
        'subscription_id',
        'model_id',
        [Sequelize.fn('COUNT', Sequelize.col('*')), 'count']
      ],
      group: ['user_id', 'subscription_id', 'model_id'],
      having: Sequelize.literal('COUNT(*) > 1')
    });

    console.log('📊 Дублирующиеся записи:');
    duplicates.forEach(record => {
      console.log({
        user_id: record.user_id,
        subscription_id: record.subscription_id,
        model_id: record.model_id,
        count: record.getDataValue('count')
      });
    });
  } catch (error) {
    console.error('❌ Ошибка при поиске дубликатов:', error.message);
  }
}

// Вызов функции
findDuplicates();

