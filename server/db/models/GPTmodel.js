'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class GPTModel extends Model {
    static associate(models) {
      this.hasMany(models.UserModelRequest, { foreignKey: 'model_id', as: 'userRequests' });
      this.hasMany(models.SubscriptionModelLimit, { foreignKey: 'model_id', as: 'subscriptionLimits' });
    }
  }
  GPTModel.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false, // Название модели обязательно
      },
      max_requests: {
        type: DataTypes.INTEGER,
        allowNull: false, // Максимальное количество запросов обязательно
      },
    },
    {
      sequelize,
      modelName: 'GPTModel',
    }
  );
  return GPTModel;
};
