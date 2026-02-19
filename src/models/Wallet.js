const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Wallet = sequelize.define('Wallet', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    balanceUsdCents: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      allowNull: false,
      comment: 'USD balance in cents (e.g., 1000 = $10.00)'
    },
    balanceZwgCents: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      allowNull: false,
      comment: 'ZWG balance in cents'
    },
    escrowUsdCents: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      allowNull: false,
      comment: 'USD held in escrow'
    },
    escrowZwgCents: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      allowNull: false,
      comment: 'ZWG held in escrow'
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
    tableName: 'wallets',
    timestamps: true,
    indexes: [
      { fields: ['userId'] }
    ]
  });

  return Wallet;
};
