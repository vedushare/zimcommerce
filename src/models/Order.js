const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Order = sequelize.define('Order', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    orderNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    buyerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    sellerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    totalAmountCents: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: 'Total order amount in cents'
    },
    currencyCode: {
      type: DataTypes.ENUM('USD', 'ZWG'),
      allowNull: false
    },
    lockedExchangeRate: {
      type: DataTypes.DECIMAL(20, 6),
      allowNull: true,
      comment: 'Exchange rate locked at checkout'
    },
    rateLockExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the locked exchange rate expires'
    },
    status: {
      type: DataTypes.ENUM(
        'cart',
        'pending_payment',
        'paid',
        'processing',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'refunded'
      ),
      defaultValue: 'cart',
      allowNull: false
    },
    deliveryAddress: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    deliveryInstructions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    shippingCostCents: {
      type: DataTypes.BIGINT,
      defaultValue: 0
    },
    deliveredAt: {
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
    tableName: 'orders',
    timestamps: true,
    indexes: [
      { fields: ['orderNumber'] },
      { fields: ['buyerId'] },
      { fields: ['sellerId'] },
      { fields: ['status'] },
      { fields: ['currencyCode'] }
    ]
  });

  return Order;
};
