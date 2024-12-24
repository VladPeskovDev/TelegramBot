const express = require('express');
const { User, UserSubscription, UserModelRequest, Subscription, SubscriptionModelLimit } = require('../../db/models'); 
const openai = require('../utils/openai');
const openaiDallRouter = express.Router();
const cache = require('../utils/cache');
require('dotenv').config();

openaiDallRouter.route('/model_dall-e-2').post(async (req, res) => {
    const { chatId, userMessage } = req.body;

    if (!userMessage) {
        return res.status(400).json({ error: 'Сообщение не может быть пустым.' });
    }

    const modelName = "dall-e-2";
    const cacheKey = `user_${chatId}_dall-e-2`;

    try {
        let userCache = cache.getCache(cacheKey);

        if (!userCache) {
            console.log('🔄 Данные пользователя не найдены в кэше. Запрашиваем из БД...');

            const user = await User.findOne({ where: { telegram_id: chatId } });
            if (!user) {
                return res.status(403).json({
                    error: 'Вы не зарегистрированы. Пожалуйста, используйте команду /start для регистрации.',
                });
            }

            const activeSubscription = await UserSubscription.findOne({
                where: { user_id: user.id },
                include: [{ model: Subscription, as: 'subscription' }],
                order: [['end_date', 'DESC']],
            });

            if (!activeSubscription || new Date(activeSubscription.end_date) < new Date()) {
                return res.status(403).json({
                    error: 'У вас нет активной подписки. Пожалуйста, оформите подписку.',
                });
            }

            const subscriptionLimit = await SubscriptionModelLimit.findOne({
                where: { subscription_id: activeSubscription.subscription_id, model_id: 5 },
            });

            const userModelRequest = await UserModelRequest.findOne({
                where: { user_id: user.id, subscription_id: activeSubscription.id, model_id: 5 },
            });

            const currentRequestCount = userModelRequest ? userModelRequest.request_count : 0;

            userCache = {
                userId: user.id,
                subscriptionId: activeSubscription.id,
                requestsLimit: subscriptionLimit.requests_limit,
                requestCount: currentRequestCount,
                syncing: false,
                modelId: 5,
            };

            cache.setCache(cacheKey, userCache, 300); // Кэш на 5 минут
        } else {
            console.log('✅ Данные пользователя получены из кэша.');
        }

        // Проверка лимита запросов
        if (userCache.requestCount >= userCache.requestsLimit) {
            return res.status(403).json({
                error: `Вы исчерпали лимит запросов (${userCache.requestsLimit}) для модели ${modelName}.`,
            });
        }

        // Увеличиваем счётчик в кэше
        userCache.requestCount += 1;
        cache.setCache(cacheKey, userCache, 300);

        // 🔄 Синхронизация каждые 5 запросов
        if (userCache.requestCount % 5 === 0 && !userCache.syncing) {
            userCache.syncing = true;
            console.log('🔄 Синхронизация счётчика с БД (5 запросов)...');
            await UserModelRequest.upsert({
                user_id: userCache.userId,
                subscription_id: userCache.subscriptionId,
                model_id: userCache.modelId,
                request_count: userCache.requestCount,
            }, {
                where: {
                    user_id: userCache.userId,
                    subscription_id: userCache.subscriptionId,
                    model_id: userCache.modelId,
                }
            });
            userCache.syncing = false;
            cache.setCache(cacheKey, userCache, 300);
        }

        // 📦 Запрос к OpenAI для генерации изображения
        const response = await openai.images.generate({
        model: modelName,
        prompt: userMessage,
        size: '1024x1024',
        n: 1,
        });

        console.log('🖼️ Ответ от OpenAI:', response.data);
        const imageUrl = response.data?.data?.[0]?.url || 'Изображение не было сгенерировано';

        console.log('🌐 Ссылка на изображение:', imageUrl);
        res.json({ imageUrl });
 
    } catch (error) {
        console.error('❌ Ошибка при обработке сообщения:', error.message);
        res.status(500).json({ error: error.message || 'Ошибка на сервере. Попробуйте позже.' });
    }
});

module.exports = openaiDallRouter;
