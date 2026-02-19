# ZimCommerce Database Schema

## Overview

This document describes the database schema for the ZimCommerce platform. The schema is designed to support multi-currency transactions, escrow payments, and OTP-based delivery verification.

## Core Principles

1. **Multi-Currency Support**: All amounts are stored in cents (BIGINT) to avoid floating-point precision issues
2. **Dual Ledgers**: Separate columns for USD and ZWG to prevent currency mixing
3. **Escrow Tracking**: Separate escrow and available balances in wallets
4. **Audit Trail**: All tables include `createdAt` and `updatedAt` timestamps

## Tables

### users

Stores all user accounts (buyers, sellers, logistics, admins).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| phoneNumber | VARCHAR(20) | Unique phone number (primary login) |
| email | VARCHAR(255) | Optional email address |
| password | VARCHAR(255) | Hashed password (bcrypt) |
| firstName | VARCHAR(100) | User's first name |
| lastName | VARCHAR(100) | User's last name |
| role | ENUM | 'buyer', 'seller', 'logistics', 'admin' |
| isVerified | BOOLEAN | Phone/email verification status |
| kycStatus | ENUM | 'pending', 'approved', 'rejected' |
| kycDocuments | JSONB | Uploaded KYC documents metadata |
| twoFactorEnabled | BOOLEAN | 2FA activation status |
| twoFactorSecret | VARCHAR(255) | 2FA secret key |
| location | JSONB | User location data |
| createdAt | TIMESTAMP | Account creation time |
| updatedAt | TIMESTAMP | Last update time |

**Indexes**: phoneNumber, email, role, isVerified

### wallets

Multi-currency wallet for each user. Tracks both available and escrowed funds.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| userId | UUID | Foreign key to users |
| balanceUsdCents | BIGINT | Available USD balance in cents |
| balanceZwgCents | BIGINT | Available ZWG balance in cents |
| escrowUsdCents | BIGINT | USD held in escrow |
| escrowZwgCents | BIGINT | ZWG held in escrow |
| createdAt | TIMESTAMP | Wallet creation time |
| updatedAt | TIMESTAMP | Last update time |

**Indexes**: userId (unique)

**Example**: A balance of 1000 cents = $10.00 USD

### products

Product listings with variant support.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| sellerId | UUID | Foreign key to users |
| name | VARCHAR(255) | Product name |
| description | TEXT | Product description |
| basePrice | BIGINT | Base price in cents |
| baseCurrency | ENUM | 'USD' or 'ZWG' |
| stockQuantity | INTEGER | Available stock |
| category | VARCHAR(100) | Product category |
| images | TEXT[] | Array of image URLs |
| variants | JSONB | Product variants (size, color, etc.) |
| isActive | BOOLEAN | Product active status |
| location | VARCHAR(255) | Product location |
| createdAt | TIMESTAMP | Product creation time |
| updatedAt | TIMESTAMP | Last update time |

**Indexes**: sellerId, category, isActive, location

### orders

Order management with status tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| orderNumber | VARCHAR(50) | Unique order number |
| buyerId | UUID | Foreign key to users |
| sellerId | UUID | Foreign key to users |
| totalAmountCents | BIGINT | Total order amount in cents |
| currencyCode | ENUM | 'USD' or 'ZWG' |
| lockedExchangeRate | DECIMAL(20,6) | Locked exchange rate |
| rateLockExpiresAt | TIMESTAMP | Rate lock expiry time |
| status | ENUM | Order status (see below) |
| deliveryAddress | JSONB | Delivery address details |
| deliveryInstructions | TEXT | Special delivery instructions |
| shippingCostCents | BIGINT | Shipping cost in cents |
| deliveredAt | TIMESTAMP | Delivery completion time |
| createdAt | TIMESTAMP | Order creation time |
| updatedAt | TIMESTAMP | Last update time |

**Order Statuses**: 
- `cart`: Items in shopping cart
- `pending_payment`: Awaiting payment
- `paid`: Payment confirmed, in escrow
- `processing`: Being prepared for delivery
- `out_for_delivery`: With delivery driver
- `delivered`: Successfully delivered
- `cancelled`: Order cancelled
- `refunded`: Payment refunded

**Indexes**: orderNumber (unique), buyerId, sellerId, status, currencyCode

### transactions

Payment transaction records with escrow tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| orderId | UUID | Foreign key to orders |
| amountCents | BIGINT | Transaction amount in cents |
| currencyCode | ENUM | 'USD' or 'ZWG' |
| exchangeRate | DECIMAL(20,6) | Exchange rate at transaction time |
| status | ENUM | Transaction status (see below) |
| paymentMethod | ENUM | 'paynow', 'dpo', 'card', 'mobile_money' |
| paymentReference | VARCHAR(255) | External payment reference |
| platformCommissionCents | BIGINT | Platform commission in cents |
| sellerAmountCents | BIGINT | Amount for seller in cents |
| webhookVerified | BOOLEAN | Webhook verification status |
| releasedAt | TIMESTAMP | Escrow release time |
| createdAt | TIMESTAMP | Transaction creation time |
| updatedAt | TIMESTAMP | Last update time |

**Transaction Statuses**:
- `pending`: Payment initiated
- `escrow`: Funds held in escrow
- `released`: Funds released to seller
- `refunded`: Transaction refunded
- `failed`: Payment failed

**Indexes**: orderId, status, currencyCode, paymentReference

**Commission Calculation**:
```
platformCommissionCents = amountCents × PLATFORM_COMMISSION_RATE
sellerAmountCents = amountCents - platformCommissionCents
```

### exchange_rates

Historical exchange rate tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| fromCurrency | VARCHAR(3) | Source currency code |
| toCurrency | VARCHAR(3) | Target currency code |
| rate | DECIMAL(20,6) | Exchange rate |
| source | VARCHAR(100) | Rate source (RBZ, Manual, etc.) |
| effectiveAt | TIMESTAMP | Rate effective time |
| createdAt | TIMESTAMP | Record creation time |

**Indexes**: (fromCurrency, toCurrency), effectiveAt

**Price Calculation Formula**:
```
ZWG Price = USD Price × Rate × (1 + Buffer%)
```
Where Buffer% is typically 3.5% to cover volatility.

### delivery_otps

OTP codes for delivery verification.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| orderId | UUID | Foreign key to orders (unique) |
| otp | VARCHAR(10) | 4-digit OTP code |
| isUsed | BOOLEAN | OTP usage status |
| expiresAt | TIMESTAMP | OTP expiry time |
| verifiedAt | TIMESTAMP | OTP verification time |
| createdAt | TIMESTAMP | OTP creation time |
| updatedAt | TIMESTAMP | Last update time |

**Indexes**: orderId (unique), otp, expiresAt

## Relationships

```
users (1) ─── (1) wallets
users (1) ─── (*) products (as seller)
users (1) ─── (*) orders (as buyer)
users (1) ─── (*) orders (as seller)
orders (1) ─── (*) order_items
orders (1) ─── (1) transactions
orders (1) ─── (1) delivery_otps
products (1) ─── (*) order_items
```

## Security Considerations

1. **Sensitive Data**: Passwords are hashed with bcrypt (12 rounds)
2. **PII Protection**: Phone numbers and emails are indexed but not logged
3. **Audit Trail**: All tables have timestamps for forensic analysis

---

Last Updated: 2026-02-19
