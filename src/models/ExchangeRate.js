const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ExchangeRate = sequelize.define('ExchangeRate', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    fromCurrency: {
      type: DataTypes.STRING(3),
      allowNull: false
    },
    toCurrency: {
      type: DataTypes.STRING(3),
      allowNull: false
    },
    rate: {
      type: DataTypes.DECIMAL(20, 6),
      allowNull: false,
      comment: 'Exchange rate (e.g., 1 USD = X ZWG)'
    },
    source: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Source of the exchange rate (e.g., RBZ, Manual)'
    },
    effectiveAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'exchange_rates',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['fromCurrency', 'toCurrency'] },
      { fields: ['effectiveAt'] }
    ]
  });

  return ExchangeRate;
};
