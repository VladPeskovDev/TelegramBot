const express = require('express');
const { User, UserSubscription, Subscription, SubscriptionModelLimit, UserModelRequest, GPTModel } = require('../../db/models');
const { format } = require('date-fns'); 
const { ru } = require('date-fns/locale'); 

const accountRouter = express.Router();

accountRouter.route('/').post(async (req, res) => {
  const { chatId } = req.body;

  if (!chatId) {
    return res.status(400).json({ error: 'Не указан chatId пользователя.' });
  }

  try {
    const user = await User.findOne({ where: { telegram_id: chatId } });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден.' });
    }

  
    const activeSubscription = await UserSubscription.findOne({
      where: { user_id: user.id },
      include: [{ model: Subscription, as: 'subscription' }],
      order: [['end_date', 'DESC']],
    });

    if (!activeSubscription || new Date(activeSubscription.end_date) < new Date()) {
      return res.status(200).json({
        firstName: user.first_name,
        lastName: user.last_name,
        subscription: 'Нет активной подписки',
        endDate: null,
        models: [],
      });
    }

    
    const formattedEndDate = format(
      new Date(activeSubscription.end_date),
      'd MMMM yyyy г.',
      { locale: ru }
    );

  
    const subscriptionLimits = await SubscriptionModelLimit.findAll({
      where: { subscription_id: activeSubscription.subscription_id },
      include: [{ model: GPTModel, as: 'model' }],
    });

    const models = [];
    for (const limit of subscriptionLimits) {
      const userModelRequest = await UserModelRequest.findOne({
        where: {
          user_id: user.id,
          model_id: limit.model_id,
        },
      });

      const remainingRequests =
        limit.requests_limit - (userModelRequest?.request_count || 0);

      models.push({
        name: limit.model.name,
        remainingRequests: Math.max(remainingRequests, 0),
      });
    }

    res.status(200).json({
      firstName: user.first_name,
      lastName: user.last_name,
      telegramId: user.telegram_id,
      subscription: activeSubscription.subscription.name,
      endDate: formattedEndDate,
      models,
    });
  } catch (error) {
    console.error('Ошибка при получении информации об аккаунте:', error.message);
    if (error.stack) console.error(error.stack);
    res.status(500).json({ error: 'Ошибка на сервере. Попробуйте позже.' });
  }
});


module.exports = accountRouter; 
