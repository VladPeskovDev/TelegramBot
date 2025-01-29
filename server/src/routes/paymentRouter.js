const express = require('express');
const crypto = require('crypto');
const {
  Payment,
  Subscription,
  UserSubscription,
  UserModelRequest,
  User,
} = require('../../db/models');
const paymentRouter = express.Router();
const cache = require('../utils/cacheRedis');

const ROBO_MERCHANT_LOGIN = process.env.ROBO_MERCHANT_LOGIN;
const ROBO_PASSWORD_1 = process.env.ROBO_PASSWORD_1;
const ROBO_PASSWORD_2 = process.env.ROBO_PASSWORD_2;

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

// Пример генерации URL Robokassa (с Shp_ параметрами)
function generateRobokassaUrl({ invoiceId, outSum, description, customParams = {} }) {
  let baseString = `${ROBO_MERCHANT_LOGIN}:${outSum}:${invoiceId}:${ROBO_PASSWORD_1}`;

  const shpParams = Object.keys(customParams)
    .sort()
    .map((key) => `Shp_${key}=${customParams[key]}`);

  if (shpParams.length > 0) {
    baseString += ':' + shpParams.join(':');
  }

  const signatureValue = md5(baseString).toUpperCase();

  let url = 'https://auth.robokassa.ru/Merchant/Index.aspx';
  url += `?MerchantLogin=${ROBO_MERCHANT_LOGIN}`;
  url += `&OutSum=${outSum}`;
  url += `&InvId=${invoiceId}`;
  url += `&Description=${encodeURIComponent(description)}`;
  url += `&SignatureValue=${signatureValue}`;

  shpParams.forEach((shpPair) => {
    const [key, value] = shpPair.split('=');
    url += `&${key}=${value}`;
  });

  // Если нужно включить тестовый режим:
  // url += `&IsTest=1`;

  return url;
}

// Создать Payment + вернуть ссылку Robokassa
paymentRouter.route('/create-payment').post(async (req, res) => {
  try {
    const { userId, subscriptionId } = req.body;

    // 1) Находим нужную подписку
    const subscription = await Subscription.findByPk(subscriptionId);
    if (!subscription) {
      return res.status(400).json({ error: 'Subscription not found' });
    }

    const amount = subscription.price;

    // 2) Отменяем предыдущие неоплаченные платежи
    await Payment.update(
      { status: 'canceled' },
      {
        where: {
          user_id: userId,
          status: 'pending',
        },
      }
    );

    // 3) Создаём новый Payment
    let payment = await Payment.create({
      user_id: userId,
      subscription_id: subscriptionId,
      amount,
      invoice_id: 0,
      status: 'pending',
      paid_at: null,
    });

    // Заполняем invoice_id = payment.id
    const invoiceId = payment.id;
    payment.invoice_id = invoiceId;
    await payment.save();

    // 4) Формируем описание для Robokassa
    const description = `Покупка подписки "${subscription.name}" (UserID: ${userId})`;

    // Доп. параметры Shp_
    const customParams = {
      user: userId,
      sub: subscriptionId,
    };

    // 5) Генерируем ссылку
    const payUrl = generateRobokassaUrl({
      invoiceId,
      outSum: amount,
      description,
      customParams,
    });

    // 6) Отправляем ссылку клиенту
    return res.json({ payUrl });
  } catch (err) {
    console.error('Ошибка в /create-payment:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});


// ResultURL - приходят данные об оплате
paymentRouter.route('/result').post(async (req, res) => {
  try {
    const { OutSum, InvId, SignatureValue, ...rest } = req.body;

    // 1) Проверяем подпись
    // Формула: OutSum:InvId:Пароль#2 + (:Shp_key=val ... по алфавиту)
    let baseString = `${OutSum}:${InvId}:${ROBO_PASSWORD_2}`;
    const shpParams = Object.keys(rest)
      .filter((k) => k.startsWith('Shp_'))
      .sort();

    shpParams.forEach((shpKey) => {
      baseString += `:${shpKey}=${rest[shpKey]}`;
    });

    const mySignature = md5(baseString).toUpperCase();
    if (mySignature !== SignatureValue.toUpperCase()) {
      console.log('Robokassa signature mismatch:', mySignature, SignatureValue);
      return res.status(400).send('bad sign');
    }

    // 2) Ищем Payment по invoice_id (InvId)
    const invoiceId = Number(InvId);
    let payment = await Payment.findOne({ where: { invoice_id: invoiceId } });
    if (!payment) {
      console.log('Payment not found, InvId = ', invoiceId);
      return res.status(404).send('payment not found');
    }

    // 3) Сверяем суммы
    const outSumFromRobo = parseFloat(OutSum);
    const outSumLocal = parseFloat(payment.amount);
    if (Math.abs(outSumFromRobo - outSumLocal) > 0.000001) {
      console.log('Amount mismatch: local:', outSumLocal, ' robo:', outSumFromRobo);
      return res.status(400).send('bad amount');
    }

    // 4) Оплата успешна -> меняем статус Payment
    payment.status = 'paid';
    payment.paid_at = new Date();
    await payment.save();

    // 4.1) Находим юзера по payment.user_id
    const userId = payment.user_id;
    const user = await User.findByPk(userId);
    if (!user) {
      console.error('User not found, user_id=', userId);
      return res.status(404).send('user not found');
    }

    // 4.2) Берём его telegram_id (chatId) и чистим кэш
    const chatId = user.telegram_id;

    // Явный список ключей, которые вы хотите удалить для данного chatId
    const contextKeys = [
      `user_${chatId}_o1-mini-2024-09-12`,
      `user_${chatId}_gpt-4o-mini`,
      `user_${chatId}_model4`,
      `user_${chatId}_model3.5`,
      `user_${chatId}_numerologist`,
    ];

    for (const key of contextKeys) {
      await cache.delCache(key);
    }

    // 5) Меняем подписку в UserSubscription
    const newSubId = payment.subscription_id;

    let userSub = await UserSubscription.findOne({
      where: { user_id: userId },
    });
    if (!userSub) {
      // Если нет записи, создаём
      userSub = await UserSubscription.create({
        user_id: userId,
        subscription_id: newSubId,
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    } else {
      // Меняем существующую
      userSub.subscription_id = newSubId;
      userSub.start_date = new Date();
      userSub.end_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await userSub.save();
    }

    // 6) Сбрасываем лимиты (request_count=0) во всех моделях
    await UserModelRequest.update({ request_count: 0 }, { where: { user_id: userId } });

    // 7) Отвечаем Robokassa: "OK{InvId}"
    return res.send(`OK${InvId}`);
  } catch (err) {
    console.error('Error in /result:', err);
    return res.status(500).send('error');
  }
});

// SuccessURL/FailURL (для браузера):
paymentRouter.route('/success').get((req, res) => {
  return res.send('Оплата успешна, подписка переключена!');
});

paymentRouter.route('/fail').get((req, res) => {
  return res.send('Оплата отменена.');
});

module.exports = paymentRouter;
