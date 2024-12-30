'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserSubscription extends Model {
    static associate(models) {
      // Связь с пользователем
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      // Связь с типом подписки
      this.belongsTo(models.Subscription, { foreignKey: 'subscription_id', as: 'subscription' });
    }
  }

  UserSubscription.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      subscription_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Subscriptions',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
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
      tableName: 'UserSubscriptions',
      indexes: [
        {
          unique: true,
          fields: ['user_id', 'subscription_id'], // Уникальный индекс для предотвращения дубликатов
        },
      ],
    }
  );

  return UserSubscription;
};
