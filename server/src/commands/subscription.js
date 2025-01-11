const subscriptionDetails = {
  standart_plan: { // Изменён ключ
    name: 'Standart Plan', // Сохранено название
    price: '5$',
    details: 'Возможность пользоваться такими моделями GPT, как GPT-3.5 Turbo и GPT-4o-mini 🚀',
    modelLimits: {
      'GPT-3.5 Turbo': 150,
      'GPT-4o-mini': 50,
      'GPT-4o': 15,
      'GPT-o1-mini-NEW': 25,
    },
  },
  standard_plus_plan: { // Изменён ключ
    name: 'Standard Plus Plan',
    price: '10$',
    details: 'Возможность пользоваться любыми моделями GPT, в том числе новой моделью GPT-o1-mini-NEW с еще большим количеством запросов 🚀',
    modelLimits: {
      'GPT-3.5 Turbo': 300,
      'GPT-4o-mini': 100,
      'GPT-4o': 30,
      'GPT-o1-mini-NEW': 50,
    },
  },
  premium_plan: { // Сохранён ключ
    name: 'Premium Plan',
    price: '25$',
    details: 'Возможность пользоваться любыми моделями GPT, в том числе новой моделью GPT-o1-mini-NEW с еще большим количеством запросов 🚀',
    modelLimits: {
      'GPT-3.5 Turbo': 1000,
      'GPT-4o-mini': 250,
      'GPT-4o': 50,
      'GPT-o1-mini-NEW': 75,
    },
  },
};


module.exports = (bot) => {
  // Команда /subscription
  bot.onText(/\/subscription/, (msg) => {
    const chatId = String(msg.chat.id);
    const options = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '💵 Standart Plan - 5$', callback_data: 'standart_plan' }],
          [{ text: '💵 Standard Plus Plan - 10$', callback_data: 'standard_plus_plan' }],
          [{ text: '💵 Premium Plan - 25$ ', callback_data: 'premium_plan' }],
        ],
      },
    };
    bot.sendMessage(chatId, 'Выберите тарифный план:', options);
  });

  // Обработка callback_query
  bot.on('callback_query', (callbackQuery) => {
    const chatId = String(callbackQuery.message.chat.id);
    const callbackData = callbackQuery.data;

    // Детализация подписки
    if (callbackData.startsWith('subscription_')) {
      if (callbackData === 'subscription_back') {
        // Возврат к начальному выбору подписки
        const options = {
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Standart Plan - 5$', callback_data: 'standart_plan' }],
              [{ text: 'Standard Plus Plan - 10$', callback_data: 'standard_plus_plan' }],
              [{ text: 'Premium Plan - 25$', callback_data: 'premium_plan' }],
            ],
          },
        };

        bot.editMessageText('Выберите тарифный план:', {
          chat_id: chatId,
          message_id: callbackQuery.message.message_id,
          reply_markup: options.reply_markup,
        });

        return;
      }

      const subscription = subscriptionDetails[callbackData];
      if (!subscription) {
        bot.answerCallbackQuery(callbackQuery.id, { text: 'Подписка не найдена.' });
        return;
      }

      const details = `
Вы выбрали: *${subscription.name}*\n
💵 *Цена:* ${subscription.price}\n
📄 *Детали:* ${subscription.details}\n
📊 *Лимиты по моделям:*\n${Object.entries(subscription.modelLimits)
        .map(([model, limit]) => `- ${model}: ${limit}`)
        .join('\n')}
      `;

      const options = {
        reply_markup: {
          inline_keyboard: [
            [{ text: `Приобрести ${subscription.name}`, callback_data: `purchase_${callbackData}` }],
            [{ text: '⬅️ Назад', callback_data: 'subscription_back' }],
          ],
        },
      };

      bot.editMessageText(details, {
        chat_id: chatId,
        message_id: callbackQuery.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: options.reply_markup,
      });
    }
  });
};
