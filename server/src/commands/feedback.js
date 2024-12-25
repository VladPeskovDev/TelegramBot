const handleFeedbackCommand = (bot) => {
    bot.onText(/\/feedback/, (msg) => {
      const chatId = String(msg.chat.id);
      const helpMessage = `
        Для связи с нами Вы можете написать на почту feedbackbot24@yahoo.com
      `;
      bot.sendMessage(chatId, helpMessage);
    });
  };
  
  
  module.exports = { handleFeedbackCommand };
  