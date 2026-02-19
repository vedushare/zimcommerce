const OTPService = require('../src/services/OTPService');
const { DeliveryOTP, Order, User, sequelize } = require('../src/models');

describe('OTPService', () => {
  let testOrder;
  let testBuyer;
  let testSeller;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clear data
    await DeliveryOTP.destroy({ where: {} });
    await Order.destroy({ where: {} });
    await User.destroy({ where: {} });

    // Create test users
    testBuyer = await User.create({
      phoneNumber: '+263771234567',
      password: 'hashedpassword',
      role: 'buyer'
    });

    testSeller = await User.create({
      phoneNumber: '+263779876543',
      password: 'hashedpassword',
      role: 'seller'
    });

    // Create test order
    testOrder = await Order.create({
      orderNumber: 'ORD-TEST-001',
      buyerId: testBuyer.id,
      sellerId: testSeller.id,
      totalAmountCents: 10000,
      currencyCode: 'USD',
      status: 'out_for_delivery'
    });
  });

  describe('generateOTP', () => {
    it('should generate OTP with correct length', () => {
      const otp = OTPService.generateOTP();
      expect(otp).toHaveLength(4);
      expect(otp).toMatch(/^\d{4}$/);
    });

    it('should generate different OTPs', () => {
      const otp1 = OTPService.generateOTP();
      const otp2 = OTPService.generateOTP();
      // While they could theoretically be the same, it's very unlikely
      // This test might occasionally fail, but helps verify randomness
      const otps = new Set();
      for (let i = 0; i < 100; i++) {
        otps.add(OTPService.generateOTP());
      }
      expect(otps.size).toBeGreaterThan(50); // At least 50 unique OTPs out of 100
    });
  });

  describe('createDeliveryOTP', () => {
    it('should create OTP for order', async () => {
      const otpRecord = await OTPService.createDeliveryOTP(testOrder.id);
      
      expect(otpRecord).toBeDefined();
      expect(otpRecord.orderId).toBe(testOrder.id);
      expect(otpRecord.otp).toMatch(/^\d{4}$/);
      expect(otpRecord.isUsed).toBe(false);
      expect(otpRecord.expiresAt).toBeInstanceOf(Date);
      expect(otpRecord.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return existing OTP if not expired', async () => {
      const otp1 = await OTPService.createDeliveryOTP(testOrder.id);
      const otp2 = await OTPService.createDeliveryOTP(testOrder.id);
      
      expect(otp1.otp).toBe(otp2.otp);
      expect(otp1.id).toBe(otp2.id);
    });

    it('should set expiry time correctly', async () => {
      const otpRecord = await OTPService.createDeliveryOTP(testOrder.id);
      const now = new Date();
      const expectedExpiry = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes
      
      const timeDiff = Math.abs(otpRecord.expiresAt - expectedExpiry);
      expect(timeDiff).toBeLessThan(5000); // Within 5 seconds
    });
  });

  describe('verifyDeliveryOTP', () => {
    it('should verify correct OTP', async () => {
      const otpRecord = await OTPService.createDeliveryOTP(testOrder.id);
      
      const result = await OTPService.verifyDeliveryOTP(testOrder.id, otpRecord.otp);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('confirmed');
    });

    it('should reject incorrect OTP', async () => {
      await OTPService.createDeliveryOTP(testOrder.id);
      
      const result = await OTPService.verifyDeliveryOTP(testOrder.id, '9999');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid');
    });

    it('should reject expired OTP', async () => {
      const otpRecord = await OTPService.createDeliveryOTP(testOrder.id);
      
      // Manually expire the OTP
      await otpRecord.update({ expiresAt: new Date(Date.now() - 1000) });
      
      const result = await OTPService.verifyDeliveryOTP(testOrder.id, otpRecord.otp);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('expired');
    });

    it('should mark OTP as used after verification', async () => {
      const otpRecord = await OTPService.createDeliveryOTP(testOrder.id);
      
      await OTPService.verifyDeliveryOTP(testOrder.id, otpRecord.otp);
      
      const updatedOTP = await DeliveryOTP.findByPk(otpRecord.id);
      expect(updatedOTP.isUsed).toBe(true);
      expect(updatedOTP.verifiedAt).toBeInstanceOf(Date);
    });

    it('should not allow reuse of OTP', async () => {
      const otpRecord = await OTPService.createDeliveryOTP(testOrder.id);
      
      await OTPService.verifyDeliveryOTP(testOrder.id, otpRecord.otp);
      const result = await OTPService.verifyDeliveryOTP(testOrder.id, otpRecord.otp);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('already used');
    });
  });

  describe('resendDeliveryOTP', () => {
    it('should create new OTP and invalidate old one', async () => {
      const oldOTP = await OTPService.createDeliveryOTP(testOrder.id);
      const newOTP = await OTPService.resendDeliveryOTP(testOrder.id);
      
      expect(newOTP.otp).not.toBe(oldOTP.otp);
      expect(newOTP.id).not.toBe(oldOTP.id);
      
      const invalidatedOTP = await DeliveryOTP.findByPk(oldOTP.id);
      expect(invalidatedOTP.isUsed).toBe(true);
    });
  });

  describe('getOrderOTP', () => {
    it('should return OTP for order', async () => {
      const created = await OTPService.createDeliveryOTP(testOrder.id);
      const retrieved = await OTPService.getOrderOTP(testOrder.id);
      
      expect(retrieved.id).toBe(created.id);
      expect(retrieved.otp).toBe(created.otp);
    });

    it('should not return used OTP', async () => {
      const otpRecord = await OTPService.createDeliveryOTP(testOrder.id);
      await otpRecord.update({ isUsed: true });
      
      const retrieved = await OTPService.getOrderOTP(testOrder.id);
      expect(retrieved).toBeNull();
    });
  });
});
