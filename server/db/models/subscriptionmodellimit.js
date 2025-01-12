'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SubscriptionModelLimit extends Model {
    static associate(models) {
      // Связь с Subscriptions
      this.belongsTo(models.Subscription, { foreignKey: 'subscription_id', as: 'subscription' });

      // Связь с GPTModels
      this.belongsTo(models.GPTModel, { foreignKey: 'model_id', as: 'model' });
    }
  }
  SubscriptionModelLimit.init(
    {
      subscription_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      model_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      requests_limit: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'SubscriptionModelLimit',
      indexes: [
        {
          fields: ['subscription_id', 'model_id'], // Индекс на subscription_id и model_id
        },
      ],
    }
  );
  return SubscriptionModelLimit;
};
