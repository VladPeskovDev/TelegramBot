'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Subscription extends Model {
    static associate(models) {
      this.hasMany(models.UserSubscription, { foreignKey: 'subscription_id', as: 'userSubscriptions' });
      this.hasMany(models.SubscriptionModelLimit, { foreignKey: 'subscription_id', as: 'modelLimits' });
    }
  }
  Subscription.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false // Название подписки обязательно
    },
    requests_limit: {
      type: DataTypes.INTEGER,
      allowNull: false // Лимит запросов обязателен
    },
    price: {
      type: DataTypes.DECIMAL,
      allowNull: false // Цена подписки обязательна
    }
  }, {
    sequelize,
    modelName: 'Subscription',
  });
  return Subscription;
};
