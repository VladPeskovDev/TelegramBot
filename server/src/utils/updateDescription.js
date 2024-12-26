 //обновление количества подписчиков   

const { UserModelRequest } = require('../../db/models');
const { Op } = require('sequelize');
const bot = require('../bot'); 


async function updateBotDescription() {
  try {
    console.log('🕒 [BOT UPDATE] Обновляем описание бота...');

    // 📊 Получаем количество активных пользователей за месяц
    const activeUsersCount = await UserModelRequest.count({
      where: {
        createdAt: {
          [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)),
        },
      },
      distinct: true,
      col: 'user_id',
    });

    // 📝 Обновляем описание бота
    const description = `🤖 Более ${activeUsersCount} пользователей за последний месяц! 🚀`;

    await bot.setMyDescription(description);

    console.log(`✅ Описание бота обновлено: "${description}"`);
  } catch (error) {
    console.error('❌ Ошибка при обновлении описания бота:', error.message);
  }
}

// Запускаем обновление
updateBotDescription();

module.exports = { updateBotDescription };

/* const { updateBotDescription } = require('./utils/updateDescription');


// 🕒 Cron Job для обновления описания бота (каждый день в 3:00 ночи)
cron.schedule('0 3 * * *', async () => {
    console.log('🔄 [CRON] Запуск обновления описания бота...');
    await updateBotDescription();
  }); */


 