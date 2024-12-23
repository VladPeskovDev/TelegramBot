'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UserModelRequest extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      this.belongsTo(models.UserSubscription, { foreignKey: 'subscription_id', as: 'subscription' });
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
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: 'UserModelRequest',
      indexes: [
        {
          unique: true,
          fields: ['user_id', 'subscription_id', 'model_id'], // Уникальный индекс
        },
      ],
    }
  );
  return UserModelRequest;
};
