# Cricket Bidding Platform - Production Deployment Guide

## 🚀 Deployment Options

### **Option 1: Vercel + Supabase (Recommended)**

**Best for**: Quick deployment, auto-scaling, minimal configuration

#### Prerequisites
1. Vercel account
2. Supabase project (production instance)
3. Domain name (optional but recommended)

#### Steps

1. **Setup Supabase Production Database**
   ```bash
   # Create new Supabase project at https://supabase.com
   # Get your production credentials:
   # - NEXT_PUBLIC_SUPABASE_URL
   # - NEXT_PUBLIC_SUPABASE_ANON_KEY
   # - SUPABASE_SERVICE_ROLE_KEY (from API settings)
   ```

2. **Deploy Database Schema**
   ```bash
   # Set your production database URL
   export DATABASE_URL="postgresql://..."

   # Run migrations
   npx prisma db push

   # Generate Prisma client
   npx prisma generate
   ```

3. **Configure Environment Variables in Vercel**
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Login and link project
   vercel login
   vercel link

   # Add environment variables
   vercel env add DATABASE_URL production
   vercel env add NEXT_PUBLIC_SUPABASE_URL production
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
   vercel env add SUPABASE_SERVICE_ROLE_KEY production
   vercel env add NEXTAUTH_URL production
   vercel env add NEXTAUTH_SECRET production
   vercel env add NEXT_PUBLIC_APP_URL production
   ```

4. **Deploy**
   ```bash
   # Deploy to production
   vercel --prod
   ```

5. **Setup Custom Domain (Optional)**
   ```bash
   # Add domain in Vercel dashboard
   vercel domains add your-domain.com
   ```

#### Cost: ~$45/month (Vercel Pro + Supabase Pro)

---

### **Option 2: Railway + Supabase**

**Best for**: More control over deployment, good performance

#### Steps

1. **Setup Railway Account**
   - Sign up at https://railway.app
   - Install Railway CLI: `npm install -g @railway/cli`

2. **Configure Project**
   ```bash
   railway login
   railway init
   railway link
   ```

3. **Set Environment Variables**
   ```bash
   railway variables set DATABASE_URL="postgresql://..."
   railway variables set NEXT_PUBLIC_SUPABASE_URL="https://..."
   railway variables set NEXTAUTH_SECRET="your-secret"
   # ... add all required variables
   ```

4. **Deploy**
   ```bash
   railway up
   ```

#### Cost: ~$45/month (Railway + Supabase Pro)

---

### **Option 3: Docker + VPS/Cloud**

**Best for**: Full control, custom infrastructure

#### Prerequisites
- VPS/Cloud instance (DigitalOcean, AWS EC2, Google Cloud, etc.)
- Docker and Docker Compose installed
- Domain name and SSL certificates

#### Steps

1. **Setup Production Environment**
   ```bash
   # Copy environment template
   cp .env.production.example .env.production

   # Edit with your production values
   nano .env.production
   ```

2. **Build and Deploy**
   ```bash
   # Build Docker image
   docker build -t cricketbid:latest .

   # Run with Docker Compose
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Setup Reverse Proxy (Nginx)**
   ```bash
   # Install and configure Nginx
   sudo apt update
   sudo apt install nginx certbot python3-certbot-nginx

   # Get SSL certificate
   sudo certbot --nginx -d your-domain.com

   # Configure Nginx (example config provided in deployment files)
   sudo nano /etc/nginx/sites-available/cricketbid
   ```

4. **Setup Database Migrations**
   ```bash
   # Run migrations in container
   docker exec -it cricketbid_app_1 npx prisma db push
   ```

#### Cost: ~$20-100/month (depending on VPS size)

---

## 🔧 Production Configuration

### **Required Environment Variables**

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/database?sslmode=require"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Auth
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-strong-secret-32-chars-minimum"

# App
NEXT_PUBLIC_APP_URL="https://your-domain.com"
NODE_ENV="production"

# Security (Optional)
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000
LOG_LEVEL=info

# Monitoring (Optional)
SENTRY_DSN="your-sentry-dsn"
REDIS_URL="redis://localhost:6379"
```

### **Database Setup**

1. **Create Production Database**
   - Use Supabase (recommended) or self-hosted PostgreSQL
   - Enable SSL connections
   - Set up regular backups

2. **Run Migrations**
   ```bash
   # Set production DATABASE_URL
   export DATABASE_URL="your-production-db-url"

   # Apply schema
   npx prisma db push

   # Or use migrations
   npx prisma migrate deploy
   ```

### **Security Checklist**

- [ ] Environment variables are secure and not logged
- [ ] Database connections use SSL
- [ ] NEXTAUTH_SECRET is cryptographically secure (32+ characters)
- [ ] Rate limiting is configured
- [ ] CORS is properly configured
- [ ] Security headers are enabled
- [ ] Admin routes are protected
- [ ] File uploads are validated and sandboxed

### **Performance Optimization**

1. **Enable Caching**
   - Set up Redis for session storage
   - Configure Next.js caching headers
   - Use CDN for static assets

2. **Database Optimization**
   - Set up connection pooling
   - Add database indexes for common queries
   - Monitor query performance

3. **Monitoring Setup**
   - Configure health check endpoints
   - Set up error tracking (Sentry)
   - Monitor performance metrics
   - Set up alerting for critical issues

---

## 📊 Monitoring & Maintenance

### **Health Checks**

- **Basic Health**: `GET /api/health`
- **Detailed Health**: `GET /api/health?detailed=true`
- **Readiness Check**: `GET /api/health/ready`

### **Metrics**

- **Performance Metrics**: `GET /api/metrics` (admin only)
- **Application Logs**: Check logging service or server logs

### **Regular Maintenance**

1. **Database Backups**
   - Automated daily backups
   - Test restore procedures monthly
   - Keep backups for at least 30 days

2. **Security Updates**
   ```bash
   # Regular dependency updates
   npm audit
   npm update

   # Check for security vulnerabilities
   npx audit-ci --high
   ```

3. **Performance Monitoring**
   - Monitor response times
   - Track error rates
   - Monitor memory usage
   - Set up alerts for issues

4. **Log Analysis**
   - Review application logs weekly
   - Monitor for suspicious activities
   - Track user behavior patterns

---

## 🚨 Troubleshooting

### **Common Issues**

1. **Build Failures**
   ```bash
   # Clear Next.js cache
   rm -rf .next

   # Reinstall dependencies
   rm -rf node_modules package-lock.json
   npm install

   # Check TypeScript errors
   npm run type-check
   ```

2. **Database Connection Issues**
   ```bash
   # Test database connection
   npx prisma db pull

   # Check SSL requirements
   # Ensure DATABASE_URL includes sslmode=require for production
   ```

3. **Authentication Issues**
   - Verify NEXTAUTH_SECRET is set
   - Check NEXTAUTH_URL matches your domain
   - Verify Supabase configuration

4. **Performance Issues**
   - Check database query performance
   - Monitor memory usage
   - Review slow request logs
   - Consider enabling Redis caching

### **Emergency Procedures**

1. **Rollback Deployment**
   ```bash
   # Vercel
   vercel rollback

   # Docker
   docker-compose down
   docker run -d previous-image-tag
   ```

2. **Database Recovery**
   ```bash
   # Restore from backup
   pg_restore -d database_url backup_file.sql
   ```

---

## 📞 Support

For deployment issues or questions:

1. Check the troubleshooting section above
2. Review application logs
3. Check health check endpoints
4. Review Supabase dashboard for auth/database issues

---

**Deployment Complete! 🎉**

Your cricket bidding platform is now ready for production use with enterprise-grade security, monitoring, and performance optimization.