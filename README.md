# ZimCommerce

A multi-vendor e-commerce platform tailored for the Zimbabwean market, featuring dual-currency support (USD/ZWG), escrow-based payments, and mobile money integration.

## Overview

ZimCommerce is designed to bridge the gap between local Zimbabwean retailers/wholesalers and consumers. Unlike global e-commerce platforms, ZimCommerce addresses the unique challenges of the Zimbabwean market including:

- **Multi-Currency Support**: Seamless switching between USD and ZWG with real-time exchange rates
- **Escrow System**: Trust-based payment holding until delivery confirmation
- **Mobile Money Integration**: Support for EcoCash, OneMoney, and ZIPIT via Paynow
- **OTP Verification**: Secure delivery confirmation using 4-digit OTP codes
- **Local Payment Gateways**: Integration with Paynow and DPO for local and card payments

## Features

### Core Functionality

- **Multi-Currency System**: Automatic price conversion with configurable safety buffer
- **Escrow Payment Processing**: Hold funds until delivery is confirmed
- **OTP Delivery Verification**: Buyers provide OTP to drivers to confirm delivery
- **Wallet System**: Separate USD and ZWG balances for sellers
- **Commission Engine**: Configurable platform commission (default 10%)
- **Exchange Rate Management**: Historical tracking and price locking during checkout

### User Roles

- **Buyers**: Browse products, place orders, track deliveries
- **Sellers**: KYC verification, product management, wallet tracking
- **Logistics**: Delivery management, OTP verification
- **Admins**: Platform management, exchange rate updates

## Technology Stack

- **Backend**: Node.js with Express
- **Database**: PostgreSQL with Sequelize ORM
- **Payment Gateways**: Paynow (mobile money), DPO (cards)
- **Security**: JWT authentication, bcrypt password hashing, rate limiting

## Installation

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone https://github.com/vedushare/zimcommerce.git
cd zimcommerce
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and configure:
- Database credentials
- JWT secret
- Payment gateway credentials (Paynow and DPO)
- Exchange rate buffer percentage

4. Create the database:
```bash
createdb zimcommerce
```

5. Run database migrations (when implemented):
```bash
npm run migrate
```

6. Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:3000`

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Currency & Exchange Rates
- Multi-currency price calculations
- Exchange rate locking during checkout
- Configurable ZWG safety buffer

### Escrow System
- Hold payments in escrow after checkout
- Release funds after OTP verification
- Refund processing

### OTP Verification
- Generate 4-digit OTP for deliveries
- Verify OTP to release escrow
- Configurable OTP expiry (default 30 minutes)

## Database Schema

### Core Tables

- **users**: User accounts (buyers, sellers, logistics, admins)
- **wallets**: Multi-currency wallet balances and escrow
- **products**: Product listings with variants
- **orders**: Order management with status tracking
- **order_items**: Individual items in orders
- **transactions**: Payment tracking with escrow status
- **exchange_rates**: Historical exchange rate data
- **delivery_otps**: OTP codes for delivery verification

## Configuration

Key configuration options in `.env`:

```
# Currency Settings
DEFAULT_CURRENCY=USD
ZWG_BUFFER_PERCENTAGE=3.5          # Safety buffer for ZWG prices
PRICE_LOCK_DURATION_MINUTES=15     # Cart price lock duration

# Commission
PLATFORM_COMMISSION_RATE=0.10      # 10% platform fee

# OTP Settings
OTP_LENGTH=4
OTP_EXPIRY_MINUTES=30

# Payment Gateways
PAYNOW_INTEGRATION_ID=your_id
PAYNOW_INTEGRATION_KEY=your_key
DPO_COMPANY_TOKEN=your_token
```

## Exchange Rate Formula

The system uses a safety buffer to protect against volatility:

```
ZWG Price = USD Price × Exchange Rate × (1 + Buffer %)
```

Default buffer is 3.5% to cover conversion slippage and volatility.

## Escrow Workflow

1. **Checkout**: Buyer pays, rate is locked for 15-30 minutes
2. **Escrow Hold**: Funds held in escrow, status = 'escrow'
3. **Delivery**: Driver delivers product to buyer
4. **OTP Verification**: Buyer provides 4-digit OTP to driver
5. **Release**: Driver enters OTP, escrow releases to seller
6. **Commission**: Platform keeps 10%, seller gets 90%

## Security Features

- **Webhook Verification**: All payment webhooks are verified server-to-server
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Password Hashing**: bcrypt with 12 rounds
- **JWT Tokens**: Secure authentication with 24-hour expiry
- **2FA Support**: Optional two-factor authentication for sellers

## Testing

Run tests:
```bash
npm test
```

Watch mode:
```bash
npm run test:watch
```

## Development Roadmap

### Phase 1 (MVP) - ✅ Foundation Complete
- [x] Database schema design
- [x] Multi-currency system
- [x] Escrow service
- [x] OTP verification
- [x] Payment gateway stubs

### Phase 2 - API Implementation
- [ ] Authentication & authorization
- [ ] Product CRUD operations
- [ ] Order management API
- [ ] Wallet operations
- [ ] Payment webhook handlers

### Phase 3 - Features
- [ ] KYC verification workflow
- [ ] File upload for product images
- [ ] Search and filtering
- [ ] Order tracking
- [ ] Notification system

### Phase 4 - Production
- [ ] Payment gateway integration (live)
- [ ] Admin dashboard
- [ ] Analytics and reporting
- [ ] Mobile app (React Native)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

ISC

## Support

For issues and questions, please open an issue on GitHub.

---

**Note**: This is the MVP implementation focusing on the core multi-currency escrow system. Payment gateway integrations are stubbed and require live credentials for production use.
