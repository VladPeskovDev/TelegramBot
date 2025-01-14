const subscriptionDetails = {
  subscription_standart_plan: { // Изменён ключ
    name: 'Standart Plan',
    price: '5$',
    details: 'Возможность пользоваться такими моделями GPT, как GPT-3.5 Turbo и GPT-4o-mini 🚀',
    modelLimits: {
      'GPT-3.5 Turbo': 150,
      'GPT-4o-mini': 50,
      'GPT-4o': 15,
      'GPT-o1-mini-NEW': 25,
    },
  },
  subscription_standard_plus_plan: {
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
  subscription_premium_plan: {
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
  subscription_numerolog_standart_plan: { 
    name: 'Numerolog Standart Plan',
    price: '5$',
    details: 'Возможность пользоваться моделями GPT, а также получать консультацию личного GPT нумеролога 🚀',
    modelLimits: {
      'GPT-3.5 Turbo': 75,
      'GPT-4o-mini': 25,
      'GPT-4o': 0,
      'GPT-o1-mini-NEW': 0,
      'Numerolog': 25,
    },
  },
  subscription_numerolog_premium_plan: { 
    name: 'Numerolog Premium Plan',
    price: '5$',
    details: 'Возможность пользоваться любыми моделями GPT, а также получать консультацию личного GPT нумеролога 🚀',
    modelLimits: {
      'GPT-3.5 Turbo': 100,
      'GPT-4o-mini': 50,
      'GPT-4o': 0,
      'GPT-o1-mini-NEW': 0,
      'Numerolog': 50,
    },
  },
};

module.exports = (bot) => {
  bot.onText(/\/subscription/, (msg) => {
    const chatId = String(msg.chat.id);
    const options = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '💵 Standart Plan - 5$', callback_data: 'subscription_standart_plan' }],
          [{ text: '💵 Standard Plus Plan - 10$', callback_data: 'subscription_standard_plus_plan' }],
          [{ text: '💵 Premium Plan - 25$ ', callback_data: 'subscription_premium_plan' }],
          [{ text: '💵 Нумеролог Standart Plan - 5$', callback_data: 'subscription_numerolog_standart_plan' }],
          [{ text: '💵 Нумеролог Premium Plan - 5$', callback_data: 'subscription_numerolog_premium_plan' }]
        ],
      },
    };
    bot.sendMessage(chatId, 'Выберите тарифный план:', options);
  });

  bot.on('callback_query', (callbackQuery) => {
    const chatId = String(callbackQuery.message.chat.id);
    const callbackData = callbackQuery.data;

    if (callbackData.startsWith('subscription_')) {
      if (callbackData === 'subscription_back') {
        const options = {
          reply_markup: {
            inline_keyboard: [
              [{ text: '💵 Standart Plan - 5$', callback_data: 'subscription_standart_plan' }],
              [{ text: '💵 Standard Plus Plan - 10$', callback_data: 'subscription_standard_plus_plan' }],
              [{ text: '💵 Premium Plan - 25$ ', callback_data: 'subscription_premium_plan' }],
              [{ text: '💵 Нумеролог Standart Plan - 5$', callback_data: 'subscription_numerolog_standart_plan' }],
              [{ text: '💵 Нумеролог Premium Plan - 5$', callback_data: 'subscription_numerolog_premium_plan' }]
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
