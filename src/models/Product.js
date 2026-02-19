const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Product = sequelize.define('Product', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    sellerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    basePrice: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: 'Base price in USD cents'
    },
    baseCurrency: {
      type: DataTypes.ENUM('USD', 'ZWG'),
      defaultValue: 'USD',
      allowNull: false
    },
    stockQuantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    images: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    variants: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Product variants (size, color, etc.)'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    location: {
      type: DataTypes.STRING(255),
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
    tableName: 'products',
    timestamps: true,
    indexes: [
      { fields: ['sellerId'] },
      { fields: ['category'] },
      { fields: ['isActive'] },
      { fields: ['location'] }
    ]
  });

  return Product;
};
