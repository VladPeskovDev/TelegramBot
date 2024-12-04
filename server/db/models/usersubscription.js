'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UserSubscription extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      this.belongsTo(models.Subscription, { foreignKey: 'subscription_id', as: 'subscription' });
      this.hasMany(models.UserModelRequest, { foreignKey: 'subscription_id', as: 'modelRequests' });
    }
  }
  UserSubscription.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      subscription_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      start_date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      end_date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'UserSubscription',
    }
  );
  return UserSubscription;
};
