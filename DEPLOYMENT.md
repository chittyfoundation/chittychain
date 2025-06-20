# ChittyChain Production Deployment Guide

## Overview

ChittyChain is a blockchain-based legal evidence management platform designed for Cook County legal compliance. This guide covers production deployment and configuration.

## Prerequisites

- Docker and Docker Compose
- PostgreSQL 15+
- Node.js 20+
- SSL certificates for HTTPS
- Domain name with DNS configuration

## Production Deployment

### 1. Environment Setup

```bash
# Clone the repository
git clone <repository-url>
cd chittychain

# Copy and configure environment variables
cp .env.production .env
# Edit .env with your production values
```

### 2. Required Environment Variables

**CRITICAL - Change these values for production:**

```env
# Security Keys (Generate secure random values)
JWT_SECRET=your-secure-32-character-jwt-secret-key
SESSION_SECRET=your-secure-session-secret-key
ENCRYPTION_KEY=your-secure-32-character-encryption-key

# Database
DATABASE_URL=postgresql://chittyuser:secure_password@postgres:5432/chittychain
DB_PASSWORD=secure_database_password

# Other passwords
REDIS_PASSWORD=secure_redis_password
GRAFANA_PASSWORD=secure_grafana_password
```

### 3. SSL Certificate Setup

```bash
# Create SSL directory
mkdir -p nginx/ssl

# Copy your SSL certificates
cp your-domain.crt nginx/ssl/
cp your-domain.key nginx/ssl/
```

### 4. Database Migration

```bash
# Run initial database setup
docker-compose up postgres -d
npm run db:push
```

### 5. Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs chittychain
```

## Service Architecture

### Core Services

1. **ChittyChain Application** (Port 5000)
   - Express.js server with blockchain implementation
   - JWT authentication with 2FA
   - File upload and IPFS integration
   - Cook County legal compliance

2. **PostgreSQL Database** (Port 5432)
   - Primary data storage
   - Drizzle ORM with type safety
   - Automated backups

3. **Redis Cache** (Port 6379)
   - Session storage
   - Rate limiting
   - Real-time data caching

4. **IPFS Node** (Port 4001, 5001, 8080)
   - Decentralized file storage
   - Evidence document storage
   - Immutable file hashing

5. **Nginx Reverse Proxy** (Port 80, 443)
   - SSL termination
   - Static file serving
   - Load balancing

### Monitoring Services

6. **Prometheus** (Port 9090)
   - Metrics collection
   - System monitoring
   - Alert management

7. **Grafana** (Port 3000)
   - Visualization dashboards
   - Performance monitoring
   - System health overview

## Security Configuration

### SSL/TLS Setup

1. Obtain SSL certificates from a trusted CA
2. Configure nginx with strong SSL settings
3. Enable HSTS and security headers
4. Set up certificate auto-renewal

### Database Security

1. Use strong passwords
2. Enable SSL connections
3. Configure firewall rules
4. Regular security updates

### Application Security

1. Environment variable validation
2. Input sanitization and validation
3. Rate limiting
4. Audit logging
5. Regular dependency updates

## Performance Tuning

### Database Optimization

```sql
-- Recommended PostgreSQL settings for production
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.7;
ALTER SYSTEM SET wal_buffers = '16MB';
SELECT pg_reload_conf();
```

### Application Optimization

1. **Connection Pooling**: Configure PostgreSQL connection limits
2. **Redis Caching**: Cache frequently accessed data
3. **File Storage**: Use IPFS for large files
4. **Compression**: Enable gzip compression in nginx

## Monitoring and Alerting

### Health Checks

- Application: `GET /health`
- Database connectivity
- IPFS node status
- Redis availability

### Key Metrics

1. **Application Metrics**
   - Request latency
   - Error rates
   - Authentication success/failure
   - Evidence submission rates

2. **System Metrics**
   - CPU usage
   - Memory consumption
   - Disk space
   - Network I/O

3. **Business Metrics**
   - Active cases
   - Evidence volume
   - User registration
   - Compliance audit results

## Backup and Recovery

### Database Backups

```bash
# Daily automated backup
docker-compose exec postgres pg_dump -U chittyuser chittychain > backup_$(date +%Y%m%d).sql

# Restore from backup
docker-compose exec -T postgres psql -U chittyuser chittychain < backup_20241219.sql
```

### File Storage Backups

```bash
# IPFS data backup
docker-compose exec ipfs ipfs repo gc
docker-compose exec ipfs tar -czf /data/ipfs_backup_$(date +%Y%m%d).tar.gz /data/ipfs
```

### Configuration Backups

- Environment variables
- SSL certificates
- nginx configuration
- Docker Compose files

## Scaling Considerations

### Horizontal Scaling

1. **Load Balancing**: Multiple application instances behind nginx
2. **Database Replication**: Primary-replica setup for read scaling
3. **IPFS Cluster**: Multiple IPFS nodes for redundancy
4. **Session Storage**: Redis cluster for session persistence

### Vertical Scaling

1. **Memory**: Increase for blockchain operations
2. **CPU**: Multi-core for concurrent request handling
3. **Storage**: SSD for database performance
4. **Network**: High bandwidth for file uploads

## Compliance and Legal Requirements

### Cook County Compliance

1. **Data Retention**: 7-year minimum retention period
2. **Audit Trails**: Complete access and modification logs
3. **Jurisdiction Validation**: Illinois-Cook County specific
4. **Case Number Format**: `YYYY-T-NNNNNN` validation

### Security Compliance

1. **AES-256 Encryption**: Data at rest and in transit
2. **Multi-Factor Authentication**: Required for all users
3. **Role-Based Access**: Case-specific permissions
4. **Regular Security Audits**: Quarterly assessments

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check database status
   docker-compose logs postgres
   
   # Verify connection string
   docker-compose exec chittychain npm run db:test
   ```

2. **Authentication Failures**
   ```bash
   # Check JWT secret configuration
   docker-compose exec chittychain node -e "console.log(process.env.JWT_SECRET?.length)"
   
   # Verify 2FA setup
   docker-compose logs chittychain | grep "2FA"
   ```

3. **File Upload Issues**
   ```bash
   # Check IPFS connectivity
   docker-compose exec chittychain curl http://ipfs:5001/api/v0/version
   
   # Verify upload permissions
   docker-compose exec chittychain ls -la /app/uploads
   ```

### Log Analysis

```bash
# Application logs
docker-compose logs -f chittychain

# Database logs
docker-compose logs -f postgres

# System metrics
docker-compose exec chittychain cat /proc/meminfo
docker-compose exec chittychain df -h
```

## Maintenance

### Regular Tasks

1. **Weekly**
   - Security patches
   - Log rotation
   - Performance monitoring

2. **Monthly**
   - Database optimization
   - Backup verification
   - Security audit

3. **Quarterly**
   - Dependency updates
   - Penetration testing
   - Compliance review

### Update Procedures

```bash
# Application updates
git pull origin main
npm install
npm run build
docker-compose up -d --build chittychain

# Database migrations
npm run db:push

# Verify deployment
curl https://yourdomain.com/health
```

## Support and Documentation

- **API Documentation**: `/api/docs`
- **Health Monitoring**: `/health`
- **Metrics**: `http://localhost:9090` (Prometheus)
- **Dashboards**: `http://localhost:3000` (Grafana)

For technical support, contact the development team with:
- Error logs
- System configuration
- Steps to reproduce issues
- Expected vs actual behavior