#!/bin/bash

# Cricket Bidding Platform - Production Setup Script
# This script helps set up Vercel + Supabase for production deployment

set -e

echo "🏏 Cricket Bidding Platform - Production Setup"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if required tools are installed
check_dependencies() {
    echo -e "${BLUE}📋 Checking dependencies...${NC}"

    if ! command -v vercel &> /dev/null; then
        echo -e "${RED}❌ Vercel CLI not found. Installing...${NC}"
        npm install -g vercel
    else
        echo -e "${GREEN}✅ Vercel CLI found${NC}"
    fi

    if ! command -v npx &> /dev/null; then
        echo -e "${RED}❌ npx not found. Please install Node.js${NC}"
        exit 1
    else
        echo -e "${GREEN}✅ Node.js/npx found${NC}"
    fi
}

# Setup Supabase production project
setup_supabase() {
    echo -e "\n${BLUE}🗄️  Supabase Production Setup${NC}"
    echo "================================"

    echo -e "${YELLOW}Please complete these steps in Supabase:${NC}"
    echo "1. Go to https://supabase.com/dashboard"
    echo "2. Click 'New Project'"
    echo "3. Create a new project (separate from development)"
    echo "4. Choose a region close to your users"
    echo "5. Wait for the project to be ready"
    echo ""

    read -p "Have you created the production Supabase project? (y/n): " supabase_ready
    if [[ $supabase_ready != "y" ]]; then
        echo -e "${RED}Please create the Supabase project first and run this script again.${NC}"
        exit 1
    fi

    echo -e "\n${YELLOW}Now collect your production credentials:${NC}"
    echo "1. Go to Settings > API in your production project"
    echo "2. Copy the Project URL (NEXT_PUBLIC_SUPABASE_URL)"
    echo "3. Copy the anon/public key (NEXT_PUBLIC_SUPABASE_ANON_KEY)"
    echo "4. Copy the service_role key (SUPABASE_SERVICE_ROLE_KEY)"
    echo ""

    read -p "Enter your production Supabase URL: " SUPABASE_URL
    read -p "Enter your production anon key: " SUPABASE_ANON_KEY
    read -p "Enter your production service role key: " SUPABASE_SERVICE_ROLE_KEY

    # Validate URLs
    if [[ ! $SUPABASE_URL =~ ^https://.*\.supabase\.co$ ]]; then
        echo -e "${RED}❌ Invalid Supabase URL format${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ Supabase credentials collected${NC}"
}

# Setup database schema
setup_database() {
    echo -e "\n${BLUE}🏗️  Database Schema Setup${NC}"
    echo "=========================="

    # Create production environment file temporarily
    cat > .env.production.temp << EOF
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres?sslmode=require"
NEXT_PUBLIC_SUPABASE_URL="${SUPABASE_URL}"
NEXT_PUBLIC_SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"
EOF

    echo -e "${YELLOW}To set up the database schema:${NC}"
    echo "1. Get your production DATABASE_URL from Supabase"
    echo "2. Go to Settings > Database in your production project"
    echo "3. Copy the connection string (use 'nodejs' tab)"
    echo "4. Run the following commands:"
    echo ""
    echo -e "${GREEN}export DATABASE_URL=\"your-production-db-url\"${NC}"
    echo -e "${GREEN}npx prisma db push${NC}"
    echo -e "${GREEN}npx prisma generate${NC}"
    echo ""

    read -p "Have you set up the database schema? (y/n): " db_ready
    if [[ $db_ready != "y" ]]; then
        echo -e "${YELLOW}⏸️  Remember to set up the database schema before deploying!${NC}"
    else
        echo -e "${GREEN}✅ Database schema ready${NC}"
    fi

    rm -f .env.production.temp
}

# Setup Vercel project
setup_vercel() {
    echo -e "\n${BLUE}🚀 Vercel Project Setup${NC}"
    echo "======================="

    # Login to Vercel
    echo -e "${YELLOW}Logging into Vercel...${NC}"
    vercel login

    # Link or create project
    echo -e "${YELLOW}Setting up Vercel project...${NC}"
    vercel link --yes

    echo -e "${GREEN}✅ Vercel project linked${NC}"
}

# Set environment variables
setup_environment() {
    echo -e "\n${BLUE}🔧 Environment Variables Setup${NC}"
    echo "==============================="

    read -p "Enter your production domain (e.g., cricketbid.com) or press Enter for Vercel domain: " DOMAIN
    if [[ -z "$DOMAIN" ]]; then
        DOMAIN="your-vercel-app.vercel.app"
        echo -e "${YELLOW}Using Vercel domain (you can add custom domain later)${NC}"
    fi

    # Generate secure secret
    NEXTAUTH_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

    echo -e "${YELLOW}Setting Vercel environment variables...${NC}"

    # Set all required environment variables (use printf to avoid trailing newline)
    printf '%s' "$SUPABASE_URL" | vercel env add NEXT_PUBLIC_SUPABASE_URL production
    printf '%s' "$SUPABASE_ANON_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
    printf '%s' "$SUPABASE_SERVICE_ROLE_KEY" | vercel env add SUPABASE_SERVICE_ROLE_KEY production
    printf '%s' "https://$DOMAIN" | vercel env add NEXTAUTH_URL production
    printf '%s' "$NEXTAUTH_SECRET" | vercel env add NEXTAUTH_SECRET production
    printf '%s' "https://$DOMAIN" | vercel env add NEXT_PUBLIC_APP_URL production
    printf '%s' "production" | vercel env add NODE_ENV production
    printf '%s' "info" | vercel env add LOG_LEVEL production
    printf '%s' "100" | vercel env add RATE_LIMIT_MAX production
    printf '%s' "900000" | vercel env add RATE_LIMIT_WINDOW_MS production

    # Ask for database URL
    echo -e "${YELLOW}Please enter your production DATABASE_URL:${NC}"
    read -s DATABASE_URL
    printf '%s' "$DATABASE_URL" | vercel env add DATABASE_URL production

    echo -e "${GREEN}✅ Environment variables set${NC}"

    # Save environment info for reference
    cat > .env.production.reference << EOF
# Production Environment Reference
# DO NOT commit this file - it's for your reference only

NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXTAUTH_URL=https://${DOMAIN}
NEXT_PUBLIC_APP_URL=https://${DOMAIN}
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
LOG_LEVEL=info
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000

# Remember to set these in Vercel dashboard:
# - DATABASE_URL (your production Postgres URL)
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
EOF

    echo -e "${YELLOW}📝 Environment reference saved to .env.production.reference${NC}"
}

# Deploy to production
deploy_production() {
    echo -e "\n${BLUE}🚀 Production Deployment${NC}"
    echo "========================"

    echo -e "${YELLOW}Running final checks...${NC}"

    # Type check
    echo "🔍 Type checking..."
    npm run build > /dev/null 2>&1 || {
        echo -e "${RED}❌ Build failed. Please fix TypeScript errors first.${NC}"
        exit 1
    }

    echo -e "${GREEN}✅ Build successful${NC}"

    # Deploy
    echo -e "${YELLOW}Deploying to production...${NC}"
    vercel --prod

    echo -e "${GREEN}🎉 Deployment complete!${NC}"
}

# Post-deployment verification
verify_deployment() {
    echo -e "\n${BLUE}✅ Post-Deployment Verification${NC}"
    echo "==============================="

    echo -e "${YELLOW}Please verify these endpoints:${NC}"
    echo "1. https://$DOMAIN - Main application"
    echo "2. https://$DOMAIN/api/health - Health check"
    echo "3. https://$DOMAIN/api/health/ready - Readiness check"
    echo ""

    echo -e "${YELLOW}🔐 Security Checklist:${NC}"
    echo "□ Custom domain configured (if desired)"
    echo "□ SSL certificate active"
    echo "□ Environment variables secured"
    echo "□ Database backups enabled"
    echo "□ Supabase RLS policies configured"
    echo ""

    echo -e "${YELLOW}📊 Monitoring:${NC}"
    echo "• Vercel Dashboard: https://vercel.com/dashboard"
    echo "• Supabase Dashboard: https://supabase.com/dashboard"
    echo "• Health Check: https://$DOMAIN/api/health"
    echo ""

    echo -e "${GREEN}🎉 Cricket Bidding Platform is live in production!${NC}"
}

# Main execution
main() {
    echo -e "${GREEN}Starting production setup...${NC}\n"

    check_dependencies
    setup_supabase
    setup_database
    setup_vercel
    setup_environment
    deploy_production
    verify_deployment

    echo -e "\n${GREEN}🏆 Production setup complete!${NC}"
    echo -e "${BLUE}Your cricket bidding platform is now live and ready for users.${NC}"
}

# Run main function
main "$@"