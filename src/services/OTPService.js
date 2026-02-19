const { DeliveryOTP, Order } = require('../models');
const config = require('../config');
const EscrowService = require('./EscrowService');

/**
 * OTP Service
 * Manages delivery OTP generation and verification
 */
class OTPService {
  /**
   * Generate random OTP
   * @returns {string} Generated OTP
   */
  generateOTP() {
    const length = config.otp.length;
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += Math.floor(Math.random() * 10);
    }
    return otp;
  }

  /**
   * Create OTP for order delivery
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Created OTP record
   */
  async createDeliveryOTP(orderId) {
    // Check if OTP already exists for this order
    const existingOTP = await DeliveryOTP.findOne({
      where: { orderId, isUsed: false }
    });

    if (existingOTP && new Date() < existingOTP.expiresAt) {
      return existingOTP;
    }

    const otp = this.generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + config.otp.expiryMinutes);

    return await DeliveryOTP.create({
      orderId,
      otp,
      expiresAt
    });
  }

  /**
   * Verify OTP and release escrow
   * @param {string} orderId - Order ID
   * @param {string} otpCode - OTP code to verify
   * @returns {Promise<Object>} Verification result
   */
  async verifyDeliveryOTP(orderId, otpCode) {
    const otpRecord = await DeliveryOTP.findOne({
      where: { orderId, isUsed: false }
    });

    if (!otpRecord) {
      return {
        success: false,
        message: 'OTP not found or already used'
      };
    }

    if (new Date() > otpRecord.expiresAt) {
      return {
        success: false,
        message: 'OTP has expired'
      };
    }

    if (otpRecord.otp !== otpCode) {
      return {
        success: false,
        message: 'Invalid OTP'
      };
    }

    // Mark OTP as used
    await otpRecord.update({
      isUsed: true,
      verifiedAt: new Date()
    });

    // Release escrow to seller
    try {
      const transaction = await EscrowService.releaseEscrow(orderId);
      
      return {
        success: true,
        message: 'Delivery confirmed and payment released to seller',
        transaction
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to release payment: ${error.message}`
      };
    }
  }

  /**
   * Resend OTP for delivery
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} New OTP record
   */
  async resendDeliveryOTP(orderId) {
    // Invalidate old OTP
    await DeliveryOTP.update(
      { isUsed: true },
      { where: { orderId, isUsed: false } }
    );

    // Create new OTP
    return await this.createDeliveryOTP(orderId);
  }

  /**
   * Get OTP for order (for testing/admin purposes)
   * @param {string} orderId - Order ID
   * @returns {Promise<Object|null>} OTP record
   */
  async getOrderOTP(orderId) {
    return await DeliveryOTP.findOne({
      where: { orderId, isUsed: false },
      include: [{
        model: Order,
        attributes: ['id', 'orderNumber', 'status']
      }]
    });
  }
}

module.exports = new OTPService();
