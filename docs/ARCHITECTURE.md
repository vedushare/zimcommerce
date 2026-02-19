# ZimCommerce Technical Architecture

## System Overview

ZimCommerce is a multi-vendor e-commerce platform built specifically for the Zimbabwean market. The architecture addresses unique local challenges including:
- Dual-currency economy (USD/ZWG)
- Mobile money dominance
- Trust and fraud concerns
- Infrastructure limitations

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                          │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐       │
│  │   Web    │  │  Mobile  │  │  Admin Portal  │       │
│  │  (PWA)   │  │   Apps   │  │                │       │
│  └──────────┘  └──────────┘  └────────────────┘       │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS/REST API
┌───────────────────────┴─────────────────────────────────┐
│                  API Gateway Layer                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Rate Limiting, CORS, Helmet Security           │   │
│  │  JWT Authentication, Request Validation         │   │
│  └─────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────┐
│              Application Layer (Node.js/Express)         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │    Auth      │  │   Products   │  │    Orders    │ │
│  │  Controller  │  │  Controller  │  │  Controller  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Wallet     │  │   Payment    │  │     OTP      │ │
│  │  Controller  │  │   Webhooks   │  │  Controller  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────┐
│                   Service Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Currency   │  │    Escrow    │  │     OTP      │ │
│  │   Service    │  │   Service    │  │   Service    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Payment    │  │     Auth     │  │     KYC      │ │
│  │   Service    │  │   Service    │  │   Service    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────┐
│                   Data Layer (Sequelize ORM)             │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐     │
│  │Users│ │Wallet│ │Product Orders│ │Txns │ │ OTP │     │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘     │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────┐
│              Database (PostgreSQL)                       │
│  - ACID Transactions                                     │
│  - JSONB Support for flexible data                      │
│  - Multi-currency ledger separation                     │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│              External Services                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Paynow     │  │     DPO      │  │   SMS/Email  │  │
│  │ (EcoCash,    │  │   (Cards)    │  │ Notifications │  │
│  │  OneMoney)   │  │              │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└──────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Currency Switcher Service

**Purpose**: Manage exchange rates and currency conversions

**Key Features**:
- Real-time exchange rate fetching
- Safety buffer application (3.5% default)
- Price locking during checkout
- Historical rate tracking

**Algorithm**:
```javascript
ZWG_Price = USD_Price × Exchange_Rate × (1 + Buffer_Percentage / 100)
```

### 2. Escrow Service

**Purpose**: Secure payment holding until delivery confirmation

**Workflow**:
1. **Payment Reception**: Funds received from payment gateway
2. **Escrow Hold**: Move funds to seller's escrow balance
3. **Delivery Verification**: Wait for OTP confirmation
4. **Release**: Transfer from escrow to available balance
5. **Commission Deduction**: Platform takes 10% commission

**State Machine**:
```
PENDING → ESCROW → RELEASED
            ↓
         REFUNDED
```

### 3. OTP Verification Service

**Purpose**: Secure delivery confirmation

**Features**:
- 4-digit numeric OTP generation
- 30-minute expiry window
- Single-use OTPs
- Resend capability

**Flow**:
```
Order Dispatched → Generate OTP → Send to Buyer
                         ↓
Driver Delivers → Buyer Provides OTP → Driver Enters OTP
                         ↓
               OTP Verified → Release Escrow
```

### 4. Payment Service

**Purpose**: Payment gateway integrations

**Supported Gateways**:
- **Paynow**: EcoCash, OneMoney, ZIPIT
- **DPO**: Visa, Mastercard, bank transfers

**Security**:
- Server-to-server webhook verification
- HMAC signature validation
- Payment reference matching
- Idempotent webhook handling

## Multi-Currency System

### Dual Ledger Architecture

Every wallet maintains separate balances:
- `balanceUsdCents`: Available USD
- `balanceZwgCents`: Available ZWG
- `escrowUsdCents`: Escrowed USD
- `escrowZwgCents`: Escrowed ZWG

**Why Separate Ledgers?**
1. No currency mixing errors
2. Simplified reconciliation
3. Clear audit trail
4. Regulatory compliance

### Price Locking Mechanism

When a buyer adds items to cart and selects currency:
1. Exchange rate is locked for 15-30 minutes
2. `lockedExchangeRate` stored in order
3. `rateLockExpiresAt` timestamp set
4. Price guaranteed during checkout window

### Exchange Rate Buffer

To protect against volatility:
```
Buffer = 3.5% (configurable)
Display_Rate = Market_Rate × (1 + Buffer)
```

This covers:
- Intraday volatility
- Gateway conversion fees
- Platform risk margin

## Data Flow Diagrams

### 1. Order Creation Flow

```
Buyer Browses → Adds to Cart → Selects Currency (USD/ZWG)
                                        ↓
                            Lock Exchange Rate (15 min)
                                        ↓
                        Proceed to Checkout → Select Payment Method
                                        ↓
                           ┌─────────────┴──────────────┐
                           │                            │
                   Paynow (Mobile Money)        DPO (Cards)
                           │                            │
                           └──────────┬─────────────────┘
                                      ↓
                            Payment Gateway Processing
                                      ↓
                            Webhook to Platform
                                      ↓
                        Verify Webhook → Create Transaction
                                      ↓
                         Move to Escrow → Order Status: PAID
```

### 2. Delivery & Payment Release Flow

```
Order PAID → Seller Processes → Dispatch to Driver
                                        ↓
                           Generate 4-digit OTP
                                        ↓
                              Send OTP to Buyer (SMS)
                                        ↓
                        Driver Delivers Package to Buyer
                                        ↓
                    Buyer Provides OTP → Driver Enters in App
                                        ↓
                           Verify OTP in System
                                        ↓
                               OTP Valid?
                           ┌──────┴───────┐
                          YES             NO
                           │               │
                  Release Escrow    Reject & Log
                           │
            ┌──────────────┴───────────────┐
            │                              │
    Seller Gets 90%              Platform Gets 10%
    (to balanceUsdCents)         (commission)
            │                              │
            └──────────────┬───────────────┘
                           ↓
              Order Status: DELIVERED
```

## Security Architecture

### Authentication
- JWT tokens with 24-hour expiry
- bcrypt password hashing (12 rounds)
- Optional 2FA for high-value accounts

### Authorization
- Role-based access control (RBAC)
- Buyer, Seller, Logistics, Admin roles
- Middleware-level permission checks

### Data Protection
- All amounts stored as BIGINT (cents) to avoid float errors
- Sensitive data encrypted at rest
- PII access logging
- HTTPS-only communication

### Rate Limiting
- 100 requests per 15 minutes per IP
- Separate limits for payment webhooks
- DDoS protection via reverse proxy

## Scalability Considerations

### Database
- **Indexing**: All foreign keys and frequent queries
- **Partitioning**: Transactions by date (future)
- **Read Replicas**: For reporting and analytics
- **Connection Pooling**: Max 10 connections

### Application
- **Stateless API**: Horizontal scaling ready
- **Async Jobs**: Queue for emails, SMS (future)
- **Caching**: Redis for sessions and rates (future)

### Performance Targets
- API Response: < 200ms (95th percentile)
- Database Queries: < 50ms average
- Payment Processing: < 5 seconds end-to-end

## Monitoring & Observability

### Logging
- Structured JSON logs
- Request/response logging
- Error tracking with stack traces
- Audit trail for financial operations

### Metrics
- Request latency
- Error rates
- Payment success rates
- Active users and orders

### Alerts
- Database connection failures
- Payment gateway downtime
- High error rates
- Escrow balance mismatches

## Deployment Architecture

### Environment Stages
1. **Development**: Local PostgreSQL, mock payment gateways
2. **Staging**: Cloud PostgreSQL, test payment credentials
3. **Production**: High-availability setup, live payments

### Infrastructure
- **App Servers**: 2+ instances behind load balancer
- **Database**: Primary + read replica
- **Backups**: Daily automated, 30-day retention
- **SSL/TLS**: Let's Encrypt or commercial certificate

## Future Enhancements

### Phase 2
- WebSocket for real-time order tracking
- Push notifications
- Advanced search with Elasticsearch
- Image upload with CDN

### Phase 3
- Mobile apps (React Native)
- Analytics dashboard
- AI-powered fraud detection
- Automated KYC verification

### Phase 4
- "ZimCommerce Fulfilled" warehousing
- Multi-language support
- Cryptocurrency payment option
- Seller performance analytics

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-19
