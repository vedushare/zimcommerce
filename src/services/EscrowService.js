const { Transaction, Wallet, Order } = require('../models');
const { sequelize } = require('../models');
const config = require('../config');

/**
 * Escrow Service
 * Manages the escrow system for secure transactions
 */
class EscrowService {
  /**
   * Hold funds in escrow after payment
   * @param {string} orderId - Order ID
   * @param {number} amountCents - Amount to hold in cents
   * @param {string} currencyCode - Currency (USD or ZWG)
   * @param {string} paymentReference - External payment reference
   * @param {string} paymentMethod - Payment method used
   * @returns {Promise<Object>} Transaction record
   */
  async holdInEscrow(orderId, amountCents, currencyCode, paymentReference, paymentMethod) {
    const transaction = await sequelize.transaction();

    try {
      const order = await Order.findByPk(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Calculate commission and seller amount
      // Use Math.floor for consistent rounding (always rounds down)
      const platformCommissionCents = Math.floor(amountCents * config.commission.platformRate);
      const sellerAmountCents = amountCents - platformCommissionCents;

      // Create transaction record
      const txn = await Transaction.create({
        orderId,
        amountCents,
        currencyCode,
        status: 'escrow',
        paymentMethod,
        paymentReference,
        platformCommissionCents,
        sellerAmountCents,
        webhookVerified: false
      }, { transaction });

      // Update seller's escrow balance
      const sellerWallet = await Wallet.findOne({
        where: { userId: order.sellerId },
        transaction
      });

      if (!sellerWallet) {
        throw new Error('Seller wallet not found');
      }

      if (currencyCode === 'USD') {
        await sellerWallet.update({
          escrowUsdCents: sellerWallet.escrowUsdCents + sellerAmountCents
        }, { transaction });
      } else {
        await sellerWallet.update({
          escrowZwgCents: sellerWallet.escrowZwgCents + sellerAmountCents
        }, { transaction });
      }

      // Update order status
      await order.update({
        status: 'paid'
      }, { transaction });

      await transaction.commit();
      return txn;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Release funds from escrow to seller after delivery confirmation
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Updated transaction
   */
  async releaseEscrow(orderId) {
    const transaction = await sequelize.transaction();

    try {
      const order = await Order.findByPk(orderId, { transaction });
      if (!order) {
        throw new Error('Order not found');
      }

      const txn = await Transaction.findOne({
        where: { orderId, status: 'escrow' },
        transaction
      });

      if (!txn) {
        throw new Error('Escrow transaction not found');
      }

      // Get seller wallet
      const sellerWallet = await Wallet.findOne({
        where: { userId: order.sellerId },
        transaction
      });

      if (!sellerWallet) {
        throw new Error('Seller wallet not found');
      }

      // Move funds from escrow to available balance
      if (txn.currencyCode === 'USD') {
        await sellerWallet.update({
          escrowUsdCents: sellerWallet.escrowUsdCents - txn.sellerAmountCents,
          balanceUsdCents: sellerWallet.balanceUsdCents + txn.sellerAmountCents
        }, { transaction });
      } else {
        await sellerWallet.update({
          escrowZwgCents: sellerWallet.escrowZwgCents - txn.sellerAmountCents,
          balanceZwgCents: sellerWallet.balanceZwgCents + txn.sellerAmountCents
        }, { transaction });
      }

      // Update transaction status
      await txn.update({
        status: 'released',
        releasedAt: new Date()
      }, { transaction });

      // Update order status
      await order.update({
        status: 'delivered',
        deliveredAt: new Date()
      }, { transaction });

      await transaction.commit();
      return txn;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Refund transaction and return funds to buyer
   * @param {string} orderId - Order ID
   * @param {string} reason - Refund reason
   * @returns {Promise<Object>} Updated transaction
   */
  async refundTransaction(orderId, reason) {
    const transaction = await sequelize.transaction();

    try {
      const order = await Order.findByPk(orderId, { transaction });
      if (!order) {
        throw new Error('Order not found');
      }

      const txn = await Transaction.findOne({
        where: { orderId, status: 'escrow' },
        transaction
      });

      if (!txn) {
        throw new Error('Escrow transaction not found');
      }

      // Release escrow from seller's wallet
      const sellerWallet = await Wallet.findOne({
        where: { userId: order.sellerId },
        transaction
      });

      if (sellerWallet) {
        if (txn.currencyCode === 'USD') {
          await sellerWallet.update({
            escrowUsdCents: sellerWallet.escrowUsdCents - txn.sellerAmountCents
          }, { transaction });
        } else {
          await sellerWallet.update({
            escrowZwgCents: sellerWallet.escrowZwgCents - txn.sellerAmountCents
          }, { transaction });
        }
      }

      // Update transaction status
      await txn.update({
        status: 'refunded'
      }, { transaction });

      // Update order status
      await order.update({
        status: 'refunded'
      }, { transaction });

      await transaction.commit();
      
      // TODO: Initiate actual refund with payment gateway
      
      return txn;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get escrow balance for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Escrow balances
   */
  async getEscrowBalance(userId) {
    const wallet = await Wallet.findOne({
      where: { userId }
    });

    if (!wallet) {
      return {
        usd: 0,
        zwg: 0
      };
    }

    return {
      usd: wallet.escrowUsdCents,
      zwg: wallet.escrowZwgCents
    };
  }

  /**
   * Verify webhook from payment gateway
   * @param {string} transactionId - Transaction ID
   * @param {string} paymentReference - Payment reference
   * @returns {Promise<boolean>} Verification result
   */
  async verifyWebhook(transactionId, paymentReference) {
    const txn = await Transaction.findByPk(transactionId);
    
    if (!txn) {
      return false;
    }

    if (txn.paymentReference !== paymentReference) {
      return false;
    }

    await txn.update({
      webhookVerified: true
    });

    return true;
  }
}

module.exports = new EscrowService();
