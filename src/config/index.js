require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  apiVersion: process.env.API_VERSION || 'v1',
  
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback_secret_key_for_development',
    expiry: process.env.JWT_EXPIRY || '24h'
  },
  
  currency: {
    defaultCurrency: process.env.DEFAULT_CURRENCY || 'USD',
    zwgBufferPercentage: parseFloat(process.env.ZWG_BUFFER_PERCENTAGE || '3.5'),
    priceLockDurationMinutes: parseInt(process.env.PRICE_LOCK_DURATION_MINUTES || '15')
  },
  
  payment: {
    paynow: {
      integrationId: process.env.PAYNOW_INTEGRATION_ID,
      integrationKey: process.env.PAYNOW_INTEGRATION_KEY
    },
    dpo: {
      companyToken: process.env.DPO_COMPANY_TOKEN,
      serviceType: process.env.DPO_SERVICE_TYPE
    }
  },
  
  commission: {
    platformRate: parseFloat(process.env.PLATFORM_COMMISSION_RATE || '0.10')
  },
  
  otp: {
    length: parseInt(process.env.OTP_LENGTH || '4'),
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '30')
  },
  
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
  }
};
