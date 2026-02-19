# Security Policy

## Reporting a Vulnerability

The ZimCommerce team takes security seriously. We appreciate your efforts to responsibly disclose your findings.

### How to Report

**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please report security vulnerabilities by email to:
- **Email**: security@zimcommerce.co.zw (or repository owner's email)
- **Subject**: [SECURITY] Brief description of the issue

### What to Include

Please include the following information:
1. **Description**: Detailed description of the vulnerability
2. **Impact**: Potential impact and attack scenario
3. **Reproduction Steps**: Step-by-step instructions to reproduce
4. **Proof of Concept**: Code or screenshots if applicable
5. **Suggested Fix**: If you have ideas for remediation

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 5 business days
- **Resolution**: Varies by severity (see below)
- **Public Disclosure**: After fix is deployed and users are notified

### Severity Levels

| Severity | Description | Response Time |
|----------|-------------|---------------|
| **Critical** | Remote code execution, SQL injection, authentication bypass | 24-48 hours |
| **High** | Data exposure, privilege escalation, payment manipulation | 3-7 days |
| **Medium** | XSS, CSRF, information disclosure | 7-14 days |
| **Low** | Minor security issues, best practice violations | 14-30 days |

## Security Best Practices

### For Developers

1. **Never Commit Secrets**
   - Use environment variables for sensitive data
   - Add `.env` to `.gitignore`
   - Review commits before pushing

2. **Input Validation**
   - Validate all user inputs
   - Use parameterized queries (we use Sequelize ORM)
   - Sanitize data before display

3. **Authentication & Authorization**
   - Use bcrypt for password hashing (12 rounds minimum)
   - Implement JWT with appropriate expiry
   - Check permissions before sensitive operations

4. **Payment Security**
   - Always verify webhooks server-to-server
   - Never trust client-side payment confirmations
   - Use HTTPS for all payment-related endpoints

5. **Currency Handling**
   - Store amounts as BIGINT (cents)
   - Never use floating-point for financial calculations
   - Verify currency conversions with locked rates

### For Administrators

1. **Database Security**
   - Use strong passwords
   - Restrict database access by IP
   - Enable SSL/TLS for connections
   - Regular backups

2. **Environment Security**
   - Keep Node.js and dependencies updated
   - Use firewall rules
   - Enable rate limiting
   - Monitor logs for suspicious activity

3. **Payment Gateway Security**
   - Secure API keys and tokens
   - Use separate credentials for staging/production
   - Implement webhook signature verification
   - Monitor for unusual transaction patterns

## Known Security Considerations

### Multi-Currency System

**Risk**: Exchange rate manipulation during checkout
**Mitigation**: Price locking mechanism (15-30 min) with rate expiry

**Risk**: Currency mixing in wallet balances
**Mitigation**: Separate USD/ZWG ledgers, no cross-currency operations

### Escrow System

**Risk**: Unauthorized escrow release
**Mitigation**: OTP-based delivery verification, audit trail

**Risk**: Double-spending or balance manipulation
**Mitigation**: Database transactions, ACID compliance

### OTP Delivery Verification

**Risk**: OTP interception or replay attacks
**Mitigation**: 
- 30-minute expiry
- Single-use OTPs
- SMS delivery (out-of-band)
- Rate limiting on verification attempts

### Webhook Security

**Risk**: Fake payment confirmations
**Mitigation**:
- HMAC signature verification
- Server-to-server webhook verification
- Payment reference matching
- Idempotent webhook processing

## Dependencies

We regularly monitor dependencies for vulnerabilities using:
- `npm audit`
- GitHub Dependabot alerts
- Manual security reviews

### Current Known Issues

Check the repository's security advisories for current issues.

## Compliance

### Data Protection

- **PII**: Phone numbers, emails stored encrypted
- **Passwords**: bcrypt hashed (12 rounds)
- **Payment Data**: Not stored; handled by payment gateways
- **Audit Trail**: All financial transactions logged

### Financial Regulations

- **Transaction Records**: Retained per regulatory requirements
- **Commission Tracking**: Transparent commission calculation
- **Reconciliation**: Daily automated reconciliation

## Security Features

### Implemented

✅ JWT authentication with expiry  
✅ bcrypt password hashing  
✅ Rate limiting (100 req/15 min)  
✅ CORS protection  
✅ Helmet security headers  
✅ Input validation  
✅ SQL injection prevention (Sequelize ORM)  
✅ Webhook signature verification  
✅ OTP-based delivery confirmation  
✅ Escrow payment system  
✅ Audit logging  

### Planned

🔲 Two-factor authentication (2FA)  
🔲 IP whitelisting for admin operations  
🔲 Fraud detection system  
🔲 Advanced rate limiting per user  
🔲 Security headers (CSP, HSTS)  
🔲 Automated security scanning  
🔲 Penetration testing  

## Contact

For security concerns:
- **Email**: security@zimcommerce.co.zw
- **PGP Key**: Available on request

For general inquiries:
- **GitHub Issues**: For non-security bugs
- **Email**: support@zimcommerce.co.zw

---

**Last Updated**: 2026-02-19
