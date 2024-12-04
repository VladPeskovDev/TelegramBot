'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UserModelRequest extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  UserModelRequest.init({
    user_id: DataTypes.INTEGER,
    subscription_id: DataTypes.INTEGER,
    model_id: DataTypes.INTEGER,
    request_count: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'UserModelRequest',
  });
  return UserModelRequest;
};