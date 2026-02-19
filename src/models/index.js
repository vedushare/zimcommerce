const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    pool: dbConfig.pool,
    dialectOptions: dbConfig.dialectOptions
  }
);

// Import models
const User = require('./User')(sequelize);
const Wallet = require('./Wallet')(sequelize);
const Product = require('./Product')(sequelize);
const Transaction = require('./Transaction')(sequelize);
const Order = require('./Order')(sequelize);
const OrderItem = require('./OrderItem')(sequelize);
const ExchangeRate = require('./ExchangeRate')(sequelize);
const DeliveryOTP = require('./DeliveryOTP')(sequelize);

// Define associations
User.hasOne(Wallet, { foreignKey: 'userId', as: 'wallet' });
Wallet.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Product, { foreignKey: 'sellerId', as: 'products' });
Product.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });

User.hasMany(Order, { foreignKey: 'buyerId', as: 'purchaseOrders' });
Order.belongsTo(User, { foreignKey: 'buyerId', as: 'buyer' });

User.hasMany(Order, { foreignKey: 'sellerId', as: 'salesOrders' });
Order.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });

Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });

OrderItem.belongsTo(Product, { foreignKey: 'productId' });
Product.hasMany(OrderItem, { foreignKey: 'productId' });

Order.hasOne(Transaction, { foreignKey: 'orderId', as: 'transaction' });
Transaction.belongsTo(Order, { foreignKey: 'orderId' });

Order.hasOne(DeliveryOTP, { foreignKey: 'orderId', as: 'deliveryOtp' });
DeliveryOTP.belongsTo(Order, { foreignKey: 'orderId' });

module.exports = {
  sequelize,
  User,
  Wallet,
  Product,
  Transaction,
  Order,
  OrderItem,
  ExchangeRate,
  DeliveryOTP
};
