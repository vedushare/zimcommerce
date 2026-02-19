const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrderItem = sequelize.define('OrderItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'orders',
        key: 'id'
      }
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      }
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1
      }
    },
    unitPriceCents: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: 'Price per unit in cents'
    },
    totalPriceCents: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: 'Total price for this line item in cents'
    },
    selectedVariant: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Selected product variant (size, color, etc.)'
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
    tableName: 'order_items',
    timestamps: true,
    indexes: [
      { fields: ['orderId'] },
      { fields: ['productId'] }
    ]
  });

  return OrderItem;
};
