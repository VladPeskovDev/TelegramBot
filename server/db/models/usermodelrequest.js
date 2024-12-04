'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UserModelRequest extends Model {
    static associate(models) {
      // Связь с Users
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });

      // Связь с UserSubscriptions
      this.belongsTo(models.UserSubscription, { foreignKey: 'subscription_id', as: 'subscription' });

      // Связь с GPTModels
      this.belongsTo(models.GPTModel, { foreignKey: 'model_id', as: 'model' });
    }
  }
  UserModelRequest.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      subscription_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      model_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      request_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0, // Счётчик запросов по умолчанию равен 0
      },
    },
    {
      sequelize,
      modelName: 'UserModelRequest',
    }
  );
  return UserModelRequest;
};
