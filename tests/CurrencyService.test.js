const CurrencyService = require('../src/services/CurrencyService');
const { ExchangeRate, sequelize } = require('../src/models');

describe('CurrencyService', () => {
  beforeAll(async () => {
    // Set up test database
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clear exchange rates before each test
    await ExchangeRate.destroy({ where: {} });
  });

  describe('setExchangeRate', () => {
    it('should create a new exchange rate', async () => {
      const rate = await CurrencyService.setExchangeRate('USD', 'ZWG', 25000.00, 'Manual');
      
      expect(rate).toBeDefined();
      expect(rate.fromCurrency).toBe('USD');
      expect(rate.toCurrency).toBe('ZWG');
      expect(parseFloat(rate.rate)).toBe(25000.00);
    });
  });

  describe('getExchangeRate', () => {
    it('should return 1 for same currency conversion', async () => {
      const rate = await CurrencyService.getExchangeRate('USD', 'USD');
      expect(rate).toBe(1);
    });

    it('should return exchange rate with buffer for ZWG', async () => {
      await CurrencyService.setExchangeRate('USD', 'ZWG', 25000.00, 'Manual');
      
      const rate = await CurrencyService.getExchangeRate('USD', 'ZWG');
      
      // Should be 25000 * 1.035 (with 3.5% buffer)
      expect(rate).toBeGreaterThan(25000);
      expect(rate).toBeCloseTo(25875, 0);
    });

    it('should throw error if exchange rate not found', async () => {
      await expect(
        CurrencyService.getExchangeRate('USD', 'ZWG')
      ).rejects.toThrow('Exchange rate not found');
    });
  });

  describe('convertAmount', () => {
    beforeEach(async () => {
      await CurrencyService.setExchangeRate('USD', 'ZWG', 25000.00, 'Manual');
    });

    it('should convert USD to ZWG with buffer', async () => {
      const usdCents = 1000; // $10.00
      const zwgCents = await CurrencyService.convertAmount(usdCents, 'USD', 'ZWG');
      
      // $10 * 25000 * 1.035 = 258,750 cents
      expect(zwgCents).toBeGreaterThan(250000);
      expect(zwgCents).toBeCloseTo(258750, -2);
    });

    it('should return same amount for same currency', async () => {
      const amount = 5000;
      const result = await CurrencyService.convertAmount(amount, 'USD', 'USD');
      expect(result).toBe(amount);
    });
  });

  describe('lockExchangeRate', () => {
    beforeEach(async () => {
      await CurrencyService.setExchangeRate('USD', 'ZWG', 25000.00, 'Manual');
    });

    it('should lock exchange rate with expiry time', async () => {
      const locked = await CurrencyService.lockExchangeRate('USD', 'ZWG');
      
      expect(locked.rate).toBeGreaterThan(25000);
      expect(locked.lockedAt).toBeInstanceOf(Date);
      expect(locked.expiresAt).toBeInstanceOf(Date);
      
      // Expiry should be 15 minutes from now (default config)
      const timeDiff = locked.expiresAt - locked.lockedAt;
      expect(timeDiff).toBeGreaterThanOrEqual(14 * 60 * 1000); // At least 14 minutes
      expect(timeDiff).toBeLessThanOrEqual(16 * 60 * 1000); // At most 16 minutes
    });
  });

  describe('calculateDualCurrencyPrices', () => {
    beforeEach(async () => {
      await CurrencyService.setExchangeRate('USD', 'ZWG', 25000.00, 'Manual');
    });

    it('should return prices in both currencies', async () => {
      const usdPriceCents = 5000; // $50.00
      const prices = await CurrencyService.calculateDualCurrencyPrices(usdPriceCents);
      
      expect(prices.usd.cents).toBe(5000);
      expect(prices.usd.formatted).toBe('$50.00');
      expect(prices.zwg.cents).toBeGreaterThan(125000000); // 50 * 25000 * 100 * 1.035
      expect(prices.zwg.formatted).toContain('ZWG');
      expect(prices.exchangeRate).toBeGreaterThan(25000);
    });
  });

  describe('formatCurrency', () => {
    it('should format USD correctly', () => {
      const formatted = CurrencyService.formatCurrency(12345, 'USD');
      expect(formatted).toBe('$123.45');
    });

    it('should format ZWG correctly', () => {
      const formatted = CurrencyService.formatCurrency(250000, 'ZWG');
      expect(formatted).toBe('ZWG2500.00');
    });
  });

  describe('getRateHistory', () => {
    it('should return exchange rate history', async () => {
      // Create multiple rates
      await CurrencyService.setExchangeRate('USD', 'ZWG', 25000.00, 'Manual');
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      await CurrencyService.setExchangeRate('USD', 'ZWG', 26000.00, 'Manual');
      await new Promise(resolve => setTimeout(resolve, 10));
      await CurrencyService.setExchangeRate('USD', 'ZWG', 27000.00, 'Manual');
      
      const history = await CurrencyService.getRateHistory('USD', 'ZWG', 10);
      
      expect(history).toHaveLength(3);
      expect(parseFloat(history[0].rate)).toBe(27000.00); // Most recent first
      expect(parseFloat(history[2].rate)).toBe(25000.00); // Oldest last
    });
  });
});
