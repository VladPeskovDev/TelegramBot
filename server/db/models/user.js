'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      this.hasMany(models.UserSubscription, { foreignKey: 'user_id', as: 'subscriptions' });
      this.hasMany(models.UserModelRequest, { foreignKey: 'user_id', as: 'modelRequests' });
      this.hasMany(models.Payment, { foreignKey: 'user_id', as: 'payments' });
    }
  }
  User.init(
    {
      telegram_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      username: DataTypes.STRING,
      first_name: DataTypes.STRING,
      last_name: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: 'User',
      indexes: [
        {
          fields: ['telegram_id'], // Индекс на telegram_id
        },
      ],
    }
  );
  return User;
};
