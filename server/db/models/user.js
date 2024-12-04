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
  User.init({
    telegram_id: DataTypes.BIGINT,
    username: DataTypes.STRING,
    first_name: DataTypes.STRING,
    last_name: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};
