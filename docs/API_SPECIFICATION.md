# ZimCommerce API Specification

## Base URL

```
Production: https://api.zimcommerce.co.zw/api/v1
Staging: https://staging-api.zimcommerce.co.zw/api/v1
Development: http://localhost:3000/api/v1
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Response Format

All API responses follow this structure:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  }
}
```

## Currency Endpoints

### Get Current Exchange Rate

Get the current exchange rate with safety buffer applied.

**Endpoint**: `GET /currency/rate`

**Query Parameters**:
- `from` (required): Source currency (USD or ZWG)
- `to` (required): Target currency (USD or ZWG)

**Response**:
```json
{
  "success": true,
  "data": {
    "fromCurrency": "USD",
    "toCurrency": "ZWG",
    "rate": 25875.00,
    "baseRate": 25000.00,
    "bufferPercentage": 3.5,
    "effectiveAt": "2026-02-19T08:30:00Z"
  }
}
```

### Convert Amount

Convert an amount from one currency to another.

**Endpoint**: `POST /currency/convert`

**Request Body**:
```json
{
  "amountCents": 10000,
  "fromCurrency": "USD",
  "toCurrency": "ZWG"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "originalAmount": {
      "cents": 10000,
      "currency": "USD",
      "formatted": "$100.00"
    },
    "convertedAmount": {
      "cents": 2587500,
      "currency": "ZWG",
      "formatted": "ZWG25875.00"
    },
    "rate": 25875.00
  }
}
```

### Get Product Price in Both Currencies

Get dual-currency pricing for a product.

**Endpoint**: `GET /currency/dual-price/:productId`

**Response**:
```json
{
  "success": true,
  "data": {
    "productId": "uuid",
    "usd": {
      "cents": 5000,
      "formatted": "$50.00"
    },
    "zwg": {
      "cents": 1293750,
      "formatted": "ZWG12937.50"
    },
    "exchangeRate": 25875.00
  }
}
```

## Order Endpoints

### Create Order (Checkout)

Create an order with locked exchange rate.

**Endpoint**: `POST /orders`

**Authentication**: Required (Buyer)

**Request Body**:
```json
{
  "items": [
    {
      "productId": "uuid",
      "quantity": 2,
      "selectedVariant": {
        "size": "L",
        "color": "Blue"
      }
    }
  ],
  "currencyCode": "USD",
  "deliveryAddress": {
    "street": "123 Main St",
    "suburb": "Avondale",
    "city": "Harare",
    "coordinates": {
      "lat": -17.8252,
      "lng": 31.0335
    }
  },
  "deliveryInstructions": "Call upon arrival"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "orderId": "uuid",
    "orderNumber": "ORD-2026-001234",
    "totalAmountCents": 10000,
    "currencyCode": "USD",
    "lockedExchangeRate": 25875.00,
    "rateLockExpiresAt": "2026-02-19T09:00:00Z",
    "status": "pending_payment",
    "items": [...],
    "paymentRequired": true
  }
}
```

### Initiate Payment

Initiate payment for an order.

**Endpoint**: `POST /orders/:orderId/payment`

**Authentication**: Required (Buyer)

**Request Body**:
```json
{
  "paymentMethod": "paynow",
  "paymentDetails": {
    "phone": "+263771234567",
    "email": "buyer@example.com"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "orderId": "uuid",
    "paymentMethod": "paynow",
    "redirectUrl": "https://paynow.co.zw/payment?ref=ORD-2026-001234",
    "pollUrl": "https://paynow.co.zw/poll?ref=ORD-2026-001234",
    "reference": "ORD-2026-001234",
    "expiresAt": "2026-02-19T09:00:00Z"
  }
}
```

### Get Order Status

Get the current status of an order.

**Endpoint**: `GET /orders/:orderId`

**Authentication**: Required (Buyer or Seller)

**Response**:
```json
{
  "success": true,
  "data": {
    "orderId": "uuid",
    "orderNumber": "ORD-2026-001234",
    "status": "paid",
    "buyer": {
      "id": "uuid",
      "name": "John Doe"
    },
    "seller": {
      "id": "uuid",
      "name": "Tech Store Harare",
      "verified": true
    },
    "items": [...],
    "totalAmountCents": 10000,
    "currencyCode": "USD",
    "paymentStatus": "escrow",
    "tracking": {
      "status": "processing",
      "updatedAt": "2026-02-19T08:45:00Z"
    }
  }
}
```

## OTP Endpoints

### Generate Delivery OTP

Generate OTP when order is dispatched (Seller/Logistics only).

**Endpoint**: `POST /orders/:orderId/otp`

**Authentication**: Required (Seller or Logistics)

**Response**:
```json
{
  "success": true,
  "data": {
    "orderId": "uuid",
    "otpGenerated": true,
    "expiresAt": "2026-02-19T10:00:00Z",
    "message": "OTP sent to buyer via SMS"
  }
}
```

### Verify Delivery OTP

Verify OTP and release escrow (Logistics only).

**Endpoint**: `POST /orders/:orderId/verify-otp`

**Authentication**: Required (Logistics)

**Request Body**:
```json
{
  "otp": "1234"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "verified": true,
    "orderId": "uuid",
    "orderStatus": "delivered",
    "paymentReleased": true,
    "sellerPaid": true,
    "deliveredAt": "2026-02-19T09:30:00Z"
  }
}
```

## Wallet Endpoints

### Get Wallet Balance

Get current wallet balances.

**Endpoint**: `GET /wallet`

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "usd": {
      "available": {
        "cents": 50000,
        "formatted": "$500.00"
      },
      "escrow": {
        "cents": 10000,
        "formatted": "$100.00"
      },
      "total": {
        "cents": 60000,
        "formatted": "$600.00"
      }
    },
    "zwg": {
      "available": {
        "cents": 100000000,
        "formatted": "ZWG1000000.00"
      },
      "escrow": {
        "cents": 0,
        "formatted": "ZWG0.00"
      },
      "total": {
        "cents": 100000000,
        "formatted": "ZWG1000000.00"
      }
    }
  }
}
```

### Request Withdrawal

Request withdrawal from wallet to mobile money or bank.

**Endpoint**: `POST /wallet/withdraw`

**Authentication**: Required (Seller)

**Request Body**:
```json
{
  "amountCents": 50000,
  "currencyCode": "USD",
  "withdrawalMethod": "ecocash",
  "destination": {
    "phone": "+263771234567",
    "name": "John Doe"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "withdrawalId": "uuid",
    "amountCents": 50000,
    "currencyCode": "USD",
    "status": "pending",
    "estimatedCompletionTime": "2026-02-19T12:00:00Z"
  }
}
```

## Webhook Endpoints

### Paynow Webhook

Receive payment notifications from Paynow.

**Endpoint**: `POST /webhooks/paynow`

**Authentication**: Webhook signature verification

**Request Body** (from Paynow):
```json
{
  "reference": "ORD-2026-001234",
  "status": "Paid",
  "amount": "100.00",
  "hash": "signature_hash"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Webhook processed"
}
```

### DPO Webhook

Receive payment notifications from DPO.

**Endpoint**: `POST /webhooks/dpo`

**Authentication**: Webhook signature verification

**Request Body** (from DPO):
```json
{
  "transactionToken": "ORD-2026-001234",
  "resultCode": "000",
  "resultExplanation": "Transaction Paid"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Webhook processed"
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `AUTH_REQUIRED` | Authentication required |
| `INVALID_TOKEN` | Invalid or expired JWT token |
| `INSUFFICIENT_PERMISSIONS` | User doesn't have required permissions |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `EXCHANGE_RATE_NOT_FOUND` | Exchange rate not available |
| `RATE_LOCK_EXPIRED` | Price lock has expired |
| `INSUFFICIENT_BALANCE` | Wallet balance too low |
| `INVALID_OTP` | OTP is invalid or expired |
| `ORDER_NOT_FOUND` | Order does not exist |
| `PAYMENT_FAILED` | Payment processing failed |
| `ESCROW_RELEASE_FAILED` | Failed to release escrow |

## Rate Limits

- **Default**: 100 requests per 15 minutes per IP
- **Authentication**: 10 requests per minute per IP
- **Payment Webhooks**: 1000 requests per minute (verified)

## Pagination

List endpoints support pagination:

**Query Parameters**:
- `page`: Page number (default: 1)
- `perPage`: Items per page (default: 20, max: 100)

**Response Format**:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "totalPages": 5,
    "totalItems": 100,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

## Testing

### Test Credentials (Staging)

**Test Buyer**:
- Phone: +263771111111
- Password: TestBuyer123!

**Test Seller**:
- Phone: +263772222222
- Password: TestSeller123!

### Test Payment Methods

**Paynow (Staging)**:
- Use phone: +263777777777
- All payments auto-approve after 10 seconds

**DPO (Staging)**:
- Card: 4111 1111 1111 1111
- CVV: 123
- Expiry: Any future date

---

**API Version**: 1.0  
**Last Updated**: 2026-02-19
