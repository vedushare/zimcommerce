# ZimCommerce Deployment Guide

## Prerequisites

### System Requirements
- **Node.js**: v14.x or higher
- **PostgreSQL**: v12.x or higher
- **Memory**: Minimum 2GB RAM
- **Storage**: Minimum 20GB SSD
- **OS**: Ubuntu 20.04+ or compatible Linux distribution

### External Services
- **Paynow Account**: Integration ID and Key
- **DPO Account**: Company Token
- **SMS Gateway**: For OTP delivery (optional)
- **Email Service**: For notifications (optional)

## Local Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/vedushare/zimcommerce.git
cd zimcommerce
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your local settings:
```env
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=zimcommerce
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your_secure_random_string_here

# Exchange rate settings
ZWG_BUFFER_PERCENTAGE=3.5
PRICE_LOCK_DURATION_MINUTES=15

# Payment gateway credentials (use test credentials)
PAYNOW_INTEGRATION_ID=test_integration_id
PAYNOW_INTEGRATION_KEY=test_integration_key
DPO_COMPANY_TOKEN=test_company_token
```

### 4. Set Up Database

```bash
# Create database
createdb zimcommerce

# Run migrations (when available)
npm run migrate

# Seed initial data (when available)
npm run seed
```

### 5. Start Development Server

```bash
npm run dev
```

Server will be available at `http://localhost:3000`

### 6. Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Staging Deployment

### 1. Server Setup (Ubuntu 20.04)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install Nginx (reverse proxy)
sudo apt install nginx -y

# Install PM2 (process manager)
sudo npm install -g pm2
```

### 2. PostgreSQL Setup

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE zimcommerce_staging;
CREATE USER zimcommerce_user WITH ENCRYPTED PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE zimcommerce_staging TO zimcommerce_user;

# Enable UUID extension
\c zimcommerce_staging
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\q
```

### 3. Application Deployment

```bash
# Create application directory
sudo mkdir -p /var/www/zimcommerce
sudo chown $USER:$USER /var/www/zimcommerce

# Clone repository
cd /var/www/zimcommerce
git clone https://github.com/vedushare/zimcommerce.git .

# Install dependencies
npm ci --production

# Create environment file
cp .env.example .env
nano .env  # Edit with production settings
```

### 4. Configure Nginx

Create `/etc/nginx/sites-available/zimcommerce`:

```nginx
server {
    listen 80;
    server_name staging-api.zimcommerce.co.zw;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/zimcommerce /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d staging-api.zimcommerce.co.zw
```

### 6. Start Application with PM2

```bash
cd /var/www/zimcommerce
pm2 start src/index.js --name zimcommerce-api
pm2 save
pm2 startup
```

### 7. Configure Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Production Deployment

### Architecture Overview

```
Internet
   ↓
Load Balancer (optional)
   ↓
Nginx (SSL Termination)
   ↓
PM2 Cluster (App Servers)
   ↓
PostgreSQL Primary
   ↓
PostgreSQL Replica (Read-only)
```

### 1. Database High Availability

#### Primary Database
```bash
# postgresql.conf
listen_addresses = '*'
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
wal_level = replica
max_wal_senders = 3
```

#### Streaming Replication Setup
```bash
# Create replication user
CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'repl_password';

# pg_hba.conf on primary
host replication replicator replica_ip/32 md5
```

### 2. Application Configuration

Production `.env`:
```env
NODE_ENV=production
PORT=3000

# Database
DB_HOST=primary-db.zimcommerce.internal
DB_PORT=5432
DB_NAME=zimcommerce
DB_USER=zimcommerce_user
DB_PASSWORD=secure_production_password

# JWT (use strong random string)
JWT_SECRET=production_secret_minimum_32_characters

# Currency
ZWG_BUFFER_PERCENTAGE=3.5
PRICE_LOCK_DURATION_MINUTES=15

# Real payment gateway credentials
PAYNOW_INTEGRATION_ID=your_live_integration_id
PAYNOW_INTEGRATION_KEY=your_live_integration_key
DPO_COMPANY_TOKEN=your_live_company_token

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
LOG_LEVEL=error
```

### 3. PM2 Cluster Mode

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'zimcommerce-api',
    script: './src/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G'
  }]
};
```

Start cluster:
```bash
pm2 start ecosystem.config.js
pm2 save
```

### 4. Database Backups

Create backup script `/opt/scripts/backup-db.sh`:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/postgresql"
DB_NAME="zimcommerce"

mkdir -p $BACKUP_DIR

pg_dump -U zimcommerce_user -h localhost $DB_NAME | \
  gzip > $BACKUP_DIR/zimcommerce_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "zimcommerce_*.sql.gz" -mtime +30 -delete
```

Add to crontab:
```bash
# Daily backup at 2 AM
0 2 * * * /opt/scripts/backup-db.sh
```

### 5. Monitoring Setup

#### PM2 Monitoring
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

#### Health Check Endpoint
The application provides `/health` endpoint:
```bash
curl http://localhost:3000/health
```

Set up external monitoring with uptimerobot or similar service.

### 6. Log Management

```bash
# Nginx log rotation
sudo nano /etc/logrotate.d/nginx

# Application logs
mkdir -p /var/www/zimcommerce/logs
```

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | development | Environment name |
| `PORT` | No | 3000 | Server port |
| `DB_HOST` | Yes | localhost | Database host |
| `DB_PORT` | No | 5432 | Database port |
| `DB_NAME` | Yes | - | Database name |
| `DB_USER` | Yes | - | Database user |
| `DB_PASSWORD` | Yes | - | Database password |
| `JWT_SECRET` | Yes | - | JWT signing secret |
| `ZWG_BUFFER_PERCENTAGE` | No | 3.5 | Exchange rate buffer |
| `PRICE_LOCK_DURATION_MINUTES` | No | 15 | Price lock duration |
| `PAYNOW_INTEGRATION_ID` | Yes | - | Paynow integration ID |
| `PAYNOW_INTEGRATION_KEY` | Yes | - | Paynow integration key |
| `DPO_COMPANY_TOKEN` | Yes | - | DPO company token |
| `PLATFORM_COMMISSION_RATE` | No | 0.10 | Commission rate (10%) |

## Troubleshooting

### Database Connection Issues
```bash
# Test PostgreSQL connection
psql -U zimcommerce_user -h localhost -d zimcommerce

# Check if PostgreSQL is running
sudo systemctl status postgresql
```

### Application Won't Start
```bash
# Check PM2 logs
pm2 logs zimcommerce-api

# Check port availability
sudo netstat -tuln | grep 3000
```

### High Memory Usage
```bash
# Monitor PM2 processes
pm2 monit

# Restart application
pm2 restart zimcommerce-api
```

## Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT secret (32+ characters)
- [ ] Enable SSL/TLS (HTTPS)
- [ ] Configure firewall rules
- [ ] Set up database backups
- [ ] Enable rate limiting
- [ ] Use environment variables for secrets
- [ ] Implement webhook signature verification
- [ ] Enable 2FA for admin accounts
- [ ] Regular security updates
- [ ] Monitor error logs
- [ ] Set up intrusion detection

## Performance Optimization

### Database
- Create indexes on frequently queried columns
- Analyze and vacuum regularly
- Use connection pooling
- Monitor slow queries

### Application
- Enable gzip compression in Nginx
- Use PM2 cluster mode
- Implement caching for exchange rates
- Optimize database queries

### Monitoring
- Set up APM (Application Performance Monitoring)
- Track response times
- Monitor error rates
- Set up alerts for anomalies

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-19
