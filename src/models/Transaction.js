const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Transaction = sequelize.define('Transaction', {
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
    amountCents: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: 'Transaction amount in cents'
    },
    currencyCode: {
      type: DataTypes.ENUM('USD', 'ZWG'),
      allowNull: false
    },
    exchangeRate: {
      type: DataTypes.DECIMAL(20, 6),
      allowNull: true,
      comment: 'Exchange rate at the time of transaction'
    },
    status: {
      type: DataTypes.ENUM('pending', 'escrow', 'released', 'refunded', 'failed'),
      defaultValue: 'pending',
      allowNull: false
    },
    paymentMethod: {
      type: DataTypes.ENUM('paynow', 'dpo', 'card', 'mobile_money'),
      allowNull: true
    },
    paymentReference: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'External payment gateway reference'
    },
    platformCommissionCents: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
      comment: 'Platform commission in cents'
    },
    sellerAmountCents: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
      comment: 'Amount to be paid to seller in cents'
    },
    webhookVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    releasedAt: {
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
    tableName: 'transactions',
    timestamps: true,
    indexes: [
      { fields: ['orderId'] },
      { fields: ['status'] },
      { fields: ['currencyCode'] },
      { fields: ['paymentReference'] }
    ]
  });

  return Transaction;
};
