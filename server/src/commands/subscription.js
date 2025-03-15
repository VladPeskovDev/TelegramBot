const axios = require('../utils/axiosInstance');
const { User } = require('../../db/models'); 

const subscriptionDetails = {
  subscription_standart_plan: {
    name: 'Standart Plan',
    price: '199₽',
    details: 'Возможность пользоваться любыми моделями GPT, в том числе новой моделью GPT-o1 🚀 и GPT-4o',
    modelLimits: {
      'GPT-o3-mini': 25,
      'GPT-4o-mini': 70,
      'GPT-4o': 15,
      'GPT-o1': 20,
      'Numerolog': 2,
      'GPT-o1-image': 5,
    },
  },
  subscription_standart_plus_plan: {
    name: 'Standart Plus Plan',
    price: '299₽',
    details: 'Возможность пользоваться любыми моделями GPT, в том числе новой моделью GPT-o1-mini-NEW 🚀',
    modelLimits: {
      'GPT-o3-mini': 35,
      'GPT-4o-mini': 100,
      'GPT-4o': 30,
      'GPT-o1': 30,
      'Numerolog': 2,
      'GPT-o1-image': 10,
    },
  },
  subscription_premium_plan: {
    name: 'Premium Plan',
    price: '999₽',
    details: 'Возможность пользоваться любыми доступными моделями GPT в большом количестве, в том числе новой моделью GPT-o1-mini-NEW 🚀',
    modelLimits: {
      'GPT-o3-mini': 100,
      'GPT-4o-mini': 250,
      'GPT-4o': 50,
      'GPT-o1': 50,
      'Numerolog': 5,
      'GPT-o1-image': 25,
    },
  },
  subscription_numerolog_standart_plan: {
    name: 'Numerolog Standart Plan',
    price: '99₽',
    details: 'Возможность пользоваться моделями GPT, а также личным GPT-нумерологом 🚀',
    modelLimits: {
      'GPT-o3-mini': 5,
      'GPT-4o-mini': 25,
      'GPT-4o': 0,
      'GPT-o1': 5,
      'Numerolog': 15,
      'GPT-o1-image': 0,
    },
  },
  subscription_numerolog_premium_plan: {
    name: 'Numerolog Premium Plan',
    price: '199₽',
    details: 'Возможность пользоваться любыми моделями GPT, а также личным GPT-нумерологом 🚀',
    modelLimits: {
      'GPT-o3-mini': 15,
      'GPT-4o-mini': 50,
      'GPT-4o': 0,
      'GPT-o1': 0,
      'Numerolog': 50,
      'GPT-o1-image': 0,
    },
  },
};

// Сопоставляем ключи из callback_data с реальными ID подписок в БД
const subscriptionMap = {
  'subscription_standart_plan': 2,
  'subscription_standart_plus_plan': 3,
  'subscription_premium_plan': 4,
  'subscription_numerolog_standart_plan': 5,
  'subscription_numerolog_premium_plan': 6,
};

module.exports = (bot) => {
  // Команда /subscription
  bot.onText(/\/subscription/, (msg) => {
    const chatId = String(msg.chat.id);
    const options = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '💵 Standart Plan - 199₽', callback_data: 'subscription_standart_plan' }],
          [{ text: '💵 Standart Plus Plan - 299₽', callback_data: 'subscription_standart_plus_plan' }],
          [{ text: '💵 Premium Plan - 999₽', callback_data: 'subscription_premium_plan' }],
          [{ text: '💵 Нумеролог Standart Plan - 99₽', callback_data: 'subscription_numerolog_standart_plan' }],
          [{ text: '💵 Нумеролог Premium Plan - 199₽', callback_data: 'subscription_numerolog_premium_plan' }]
        ],
      },
    };
    bot.sendMessage(chatId, 'Выберите тарифный план:', options);
  });

  // Обработка callback (кнопок) для выбора и покупки подписки
  bot.on('callback_query', async (callbackQuery) => {
    const chatId = String(callbackQuery.message.chat.id);
    const callbackData = callbackQuery.data;

    // Шаг 1: Обработка возврата "⬅️ Назад"
    if (callbackData === 'subscription_back') {
      const options = {
        reply_markup: {
          inline_keyboard: [
            [{ text: '💵 Standart Plan - 199₽', callback_data: 'subscription_standart_plan' }],
            [{ text: '💵 Standart Plus Plan - 299₽', callback_data: 'subscription_standart_plus_plan' }],
            [{ text: '💵 Premium Plan - 999₽', callback_data: 'subscription_premium_plan' }],
            [{ text: '💵 Нумеролог Standart Plan - 99₽', callback_data: 'subscription_numerolog_standart_plan' }],
            [{ text: '💵 Нумеролог Premium Plan - 199₽', callback_data: 'subscription_numerolog_premium_plan' }]
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

    // Шаг 2: Если пользователь выбрал какую-то подписку
    if (callbackData.startsWith('subscription_')) {
      const subscription = subscriptionDetails[callbackData];
      if (!subscription) {
        bot.answerCallbackQuery(callbackQuery.id, { text: 'Подписка не найдена.' });
        return;
      }

      const details = `
Вы выбрали: *${subscription.name}*\n
🪙 *Цена:* ${subscription.price}\n
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

    // Шаг 3: Если пользователь нажал "Приобрести …"
    if (callbackData.startsWith('purchase_')) {
      try {
        // Получаем ключ вида "subscription_standart_plan"
        const planKey = callbackData.replace('purchase_', '');
        // Определяем subscriptionId из карты (subscriptionMap)
        const subscriptionId = subscriptionMap[planKey];
        if (!subscriptionId) {
          await bot.sendMessage(chatId, 'Неизвестный план для покупки.');
          return;
        }

        // Ищем/создаём пользователя в БД по telegram_id = chatId
        // (запись в таблице Users)
        const [userInstance] = await User.findOrCreate({
          where: { telegram_id: chatId },
          defaults: {
            telegram_id: chatId,
            username: callbackQuery.from.username || '',
            first_name: callbackQuery.from.first_name || null,
            last_name: callbackQuery.from.last_name || null,
          }
        });

        // Теперь вызываем наш бэкенд на /create-payment
        const { data } = await axios.post('/api/robokassa/create-payment', {
          userId: userInstance.id,    // это id из БД, а не chatId
          subscriptionId
        });

        // data.payUrl - ссылка на оплату Robokassa
        if (data.payUrl) {
          await bot.sendMessage(chatId,
            'Для оплаты нажмите на кнопку:',
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: 'Оплатить подписку',
                      url: data.payUrl,
                    },
                  ],
                ],
              },
            });
        } else {
          await bot.sendMessage(chatId, 'Не удалось получить ссылку на оплату.');
        }

      } catch (error) {
        console.error('Ошибка при создании платежа:', error.message);
        await bot.sendMessage(chatId, 'Произошла ошибка при создании платежа. Повторите позже.');
      }
    }
  });
};

















/* const subscriptionDetails = {
  subscription_standart_plan: { // Изменён ключ
    name: 'Standart Plan',
    price: '149₽',
    details: 'Возможность пользоваться такими моделями GPT, как GPT-3.5 Turbo и GPT-4o-mini 🚀',
    modelLimits: {
      'GPT-3.5 Turbo': 150,
      'GPT-4o-mini': 50,
      'GPT-4o': 15,
      'GPT-o1-mini-NEW': 25, //149 рублей
      'Numerolog': 2,
    },
  },
  subscription_standart_plus_plan: {
    name: 'Standart Plus Plan',
    price: '299₽',
    details: 'Возможность пользоваться любыми моделями GPT, в том числе новой моделью GPT-o1-mini-NEW с еще большим количеством запросов 🚀',
    modelLimits: {
      'GPT-3.5 Turbo': 300,
      'GPT-4o-mini': 100,
      'GPT-4o': 30,
      'GPT-o1-mini-NEW': 50, //299 рублей
      'Numerolog': 2,
    },
  },
  subscription_premium_plan: {
    name: 'Premium Plan',
    price: '899₽',
    details: 'Возможность пользоваться любыми моделями GPT, в том числе новой моделью GPT-o1-mini-NEW с еще большим количеством запросов 🚀',
    modelLimits: {
      'GPT-3.5 Turbo': 1000,
      'GPT-4o-mini': 250,
      'GPT-4o': 50,
      'GPT-o1-mini-NEW': 75,
      'Numerolog': 5,   //899 рублей
    },
  },
  subscription_numerolog_standart_plan: { 
    name: 'Numerolog Standart Plan',
    price: '99₽',
    details: 'Возможность пользоваться моделями GPT, а также получать консультацию личного GPT нумеролога 🚀',
    modelLimits: {
      'GPT-3.5 Turbo': 75,
      'GPT-4o-mini': 25,
      'GPT-4o': 0,
      'GPT-o1-mini-NEW': 0,
      'Numerolog': 20,   //99 рублей 
    },
  },
  subscription_numerolog_premium_plan: { 
    name: 'Numerolog Premium Plan',
    price: '199₽',
    details: 'Возможность пользоваться любыми моделями GPT, а также получать консультацию личного GPT нумеролога 🚀',
    modelLimits: {
      'GPT-3.5 Turbo': 100,
      'GPT-4o-mini': 50,
      'GPT-4o': 0,
      'GPT-o1-mini-NEW': 0,
      'Numerolog': 50,  //199 рублей 
    },
  },
};

module.exports = (bot) => {
  bot.onText(/\/subscription/, (msg) => {
    const chatId = String(msg.chat.id);
    const options = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '💵 Standart Plan - 149₽', callback_data: 'subscription_standart_plan' }],
          [{ text: '💵 Standart Plus Plan - 299₽', callback_data: 'subscription_standart_plus_plan' }],
          [{ text: '💵 Premium Plan - 899₽', callback_data: 'subscription_premium_plan' }],
          [{ text: '💵 Нумеролог Standart Plan - 99₽', callback_data: 'subscription_numerolog_standart_plan' }],
          [{ text: '💵 Нумеролог Premium Plan - 199₽', callback_data: 'subscription_numerolog_premium_plan' }]
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
              [{ text: '💵 Standart Plan - 149₽', callback_data: 'subscription_standart_plan' }],
              [{ text: '💵 Standart Plus Plan - 299₽', callback_data: 'subscription_standart_plus_plan' }],
              [{ text: '💵 Premium Plan - 899₽', callback_data: 'subscription_premium_plan' }],
              [{ text: '💵 Нумеролог Standart Plan - 99₽', callback_data: 'subscription_numerolog_standart_plan' }],
              [{ text: '💵 Нумеролог Premium Plan - 199₽', callback_data: 'subscription_numerolog_premium_plan' }]
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
🪙 *Цена:* ${subscription.price}\n
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
*/