'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Payment extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      this.belongsTo(models.Subscription, { foreignKey: 'subscription_id', as: 'subscription' });
    }
  }

  Payment.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      subscription_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL,
        allowNull: false,
      },
      invoice_id: { 
        // InvId для Robokassa
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pending' // pending | paid | failed | canceled
      },
      paid_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
    },
    {
      sequelize,
      modelName: 'Payment',
    }
  );
  return Payment;
};
