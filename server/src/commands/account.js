const axios = require('../utils/axiosInstance');

module.exports = (bot) => {
  bot.onText(/\/account/, async (msg) => {
    const chatId = String(msg.chat.id);

    try {
      const response = await axios.post('/api/account', { chatId });

      const accountInfo = response.data;

      let accountMessage = `
        👤 Ваш аккаунт:
        - Имя: ${accountInfo.firstName || 'Не указано'}
        - Фамилия: ${accountInfo.lastName || 'Не указано'}
        - Telegram ID: ${accountInfo.telegramId}
        - Подписка: ${accountInfo.subscription || 'Нет подписки'}
        - Дата окончания подписки: ${accountInfo.endDate || 'Не указано'}
      `;

      if (accountInfo.models && accountInfo.models.length > 0) {
        accountMessage += '\n\n📊 Оставшиеся запросы по моделям:\n';
        accountInfo.models.forEach((model) => {
          accountMessage += `- ${model.name}: ${model.remainingRequests} запросов\n`;
        });
      } else {
        accountMessage += '\n\n📊 Запросы: Информация отсутствует.';
      }

      bot.sendMessage(chatId, accountMessage);
    } catch (error) {
      console.error('Ошибка при получении информации об аккаунте:', error);
      const errorMessage =
        error.response?.data?.error || 'Произошла ошибка. Пожалуйста, попробуйте позже.';
      bot.sendMessage(chatId, errorMessage);
    }
  });
};
