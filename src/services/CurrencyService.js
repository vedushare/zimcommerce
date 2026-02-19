const { ExchangeRate } = require('../models');
const config = require('../config');

/**
 * Currency Switcher Service
 * Manages exchange rates between USD and ZWG with safety buffer
 */
class CurrencyService {
  /**
   * Get the current exchange rate with safety buffer
   * @param {string} fromCurrency - Source currency (USD or ZWG)
   * @param {string} toCurrency - Target currency (USD or ZWG)
   * @returns {Promise<number>} Exchange rate with buffer
   */
  async getExchangeRate(fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) {
      return 1;
    }

    // Fetch the latest exchange rate from database
    const rateRecord = await ExchangeRate.findOne({
      where: {
        fromCurrency,
        toCurrency
      },
      order: [['effectiveAt', 'DESC']]
    });

    if (!rateRecord) {
      throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
    }

    const baseRate = parseFloat(rateRecord.rate);
    
    // Apply safety buffer when converting to ZWG
    if (toCurrency === 'ZWG') {
      const bufferMultiplier = 1 + (config.currency.zwgBufferPercentage / 100);
      return baseRate * bufferMultiplier;
    }

    return baseRate;
  }

  /**
   * Convert amount from one currency to another
   * @param {number} amountCents - Amount in cents
   * @param {string} fromCurrency - Source currency
   * @param {string} toCurrency - Target currency
   * @returns {Promise<number>} Converted amount in cents
   */
  async convertAmount(amountCents, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) {
      return amountCents;
    }

    const rate = await this.getExchangeRate(fromCurrency, toCurrency);
    return Math.round(amountCents * rate);
  }

  /**
   * Lock exchange rate for a specific duration (used during checkout)
   * @param {string} fromCurrency - Source currency
   * @param {string} toCurrency - Target currency
   * @returns {Promise<Object>} Locked rate and expiry time
   */
  async lockExchangeRate(fromCurrency, toCurrency) {
    const rate = await this.getExchangeRate(fromCurrency, toCurrency);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + config.currency.priceLockDurationMinutes);

    return {
      rate,
      lockedAt: new Date(),
      expiresAt
    };
  }

  /**
   * Create or update exchange rate
   * @param {string} fromCurrency - Source currency
   * @param {string} toCurrency - Target currency
   * @param {number} rate - Exchange rate
   * @param {string} source - Source of rate (e.g., 'RBZ', 'Manual')
   * @returns {Promise<Object>} Created exchange rate record
   */
  async setExchangeRate(fromCurrency, toCurrency, rate, source = 'Manual') {
    return await ExchangeRate.create({
      fromCurrency,
      toCurrency,
      rate,
      source,
      effectiveAt: new Date()
    });
  }

  /**
   * Get exchange rate history
   * @param {string} fromCurrency - Source currency
   * @param {string} toCurrency - Target currency
   * @param {number} limit - Number of records to fetch
   * @returns {Promise<Array>} Exchange rate history
   */
  async getRateHistory(fromCurrency, toCurrency, limit = 30) {
    return await ExchangeRate.findAll({
      where: {
        fromCurrency,
        toCurrency
      },
      order: [['effectiveAt', 'DESC']],
      limit
    });
  }

  /**
   * Calculate price with safety buffer for display
   * @param {number} usdPriceCents - Price in USD cents
   * @returns {Promise<Object>} Prices in both currencies
   */
  async calculateDualCurrencyPrices(usdPriceCents) {
    const zwgPriceCents = await this.convertAmount(usdPriceCents, 'USD', 'ZWG');
    const exchangeRate = await this.getExchangeRate('USD', 'ZWG');

    return {
      usd: {
        cents: usdPriceCents,
        formatted: this.formatCurrency(usdPriceCents, 'USD')
      },
      zwg: {
        cents: zwgPriceCents,
        formatted: this.formatCurrency(zwgPriceCents, 'ZWG')
      },
      exchangeRate
    };
  }

  /**
   * Format currency for display
   * @param {number} amountCents - Amount in cents
   * @param {string} currency - Currency code
   * @returns {string} Formatted currency string
   */
  formatCurrency(amountCents, currency) {
    const amount = amountCents / 100;
    const symbol = currency === 'USD' ? '$' : 'ZWG';
    return `${symbol}${amount.toFixed(2)}`;
  }
}

module.exports = new CurrencyService();
