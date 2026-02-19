const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DeliveryOTP = sequelize.define('DeliveryOTP', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'orders',
        key: 'id'
      }
    },
    otp: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    isUsed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'delivery_otps',
    timestamps: true,
    indexes: [
      { fields: ['orderId'] },
      { fields: ['otp'] },
      { fields: ['expiresAt'] }
    ]
  });

  return DeliveryOTP;
};
