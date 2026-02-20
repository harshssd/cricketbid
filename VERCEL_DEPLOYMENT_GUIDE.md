# Cricket Bid - Vercel Deployment Guide

This guide will help you deploy your Cricket Bid application to Vercel using your existing Supabase database.

## Prerequisites

- [x] Vercel CLI installed (`vercel` command available)
- [x] Git repository initialized
- [x] Supabase project set up
- [x] Database schema deployed to Supabase

## Step 1: Get Required Credentials from Supabase

### 1.1 Database Connection String
1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project: `offnmpuiogbuxbmhgdck`
3. Go to Settings → Database
4. Copy the connection string in the format:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.offnmpuiogbuxbmhgdck.supabase.co:5432/postgres?schema=public&pgbouncer=true
   ```

### 1.2 Service Role Key
1. In your Supabase dashboard, go to Settings → API
2. Copy the `service_role` secret key (not the anon key)

## Step 2: Commit Your Changes

Before deploying, commit all your recent changes:

```bash
# Add all files to git
git add .

# Commit changes
git commit -m "feat: add multiple role selection and prepare for deployment

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Optional: Push to remote repository
git push origin main
```

## Step 3: Deploy to Vercel

### 3.1 Login to Vercel
```bash
vercel login
```

### 3.2 Deploy the Project
```bash
# Run deployment command
vercel --prod

# Or use the npm script
npm run vercel:deploy
```

### 3.3 Configure Environment Variables

During deployment or after, set these environment variables in Vercel dashboard:

**Required Variables:**
- `DATABASE_URL` - Your Supabase PostgreSQL connection string
- `NEXT_PUBLIC_SUPABASE_URL` - `https://offnmpuiogbuxbmhgdck.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `NEXTAUTH_SECRET` - Generate random string (use `openssl rand -base64 32`)
- `NEXTAUTH_URL` - Your Vercel app URL (e.g., `https://cricket-bid.vercel.app`)
- `NEXT_PUBLIC_APP_URL` - Same as NEXTAUTH_URL

**Optional Variables:**
- `NEXT_PUBLIC_ENABLE_DRY_RUN` - `false`
- `NEXT_PUBLIC_ENABLE_SOCIAL_SHARING` - `true`
- `NEXT_PUBLIC_ENABLE_REALTIME` - `true`
- `RATE_LIMIT_MAX` - `100`
- `RATE_LIMIT_WINDOW_MS` - `3600000`
- `LOG_LEVEL` - `info`

### 3.4 Set Environment Variables via CLI (Alternative)

```bash
# Set database URL
vercel env add DATABASE_URL production

# Set Supabase service role key
vercel env add SUPABASE_SERVICE_ROLE_KEY production

# Generate and set NextAuth secret
vercel env add NEXTAUTH_SECRET production

# Set app URL (replace with your actual URL)
vercel env add NEXTAUTH_URL production
vercel env add NEXT_PUBLIC_APP_URL production
```

## Step 4: Initialize Database Schema

After deployment, you need to push your Prisma schema to Supabase:

### 4.1 Update your local DATABASE_URL temporarily
```bash
# Create a temporary .env.deploy file
echo "DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.offnmpuiogbuxbmhgdck.supabase.co:5432/postgres?schema=public&pgbouncer=true" > .env.deploy
```

### 4.2 Push schema to Supabase
```bash
# Use the deploy environment
DATABASE_URL=$(cat .env.deploy | grep DATABASE_URL | cut -d '=' -f2-) npx prisma db push

# Or generate Prisma client
DATABASE_URL=$(cat .env.deploy | grep DATABASE_URL | cut -d '=' -f2-) npx prisma generate
```

### 4.3 Clean up
```bash
rm .env.deploy
```

## Step 5: Redeploy with Schema

After setting up the database, redeploy to ensure everything is working:

```bash
vercel --prod
```

## Step 6: Verify Deployment

1. Visit your deployed app URL
2. Test user authentication
3. Try creating an auction
4. Test player editing functionality
5. Verify database operations

## Troubleshooting

### Common Issues:

1. **Database Connection Error**
   - Verify DATABASE_URL format
   - Check Supabase password
   - Ensure pgbouncer=true is included

2. **Authentication Issues**
   - Verify NEXTAUTH_SECRET is set
   - Check NEXTAUTH_URL matches your domain
   - Confirm Supabase keys are correct

3. **Build Errors**
   - Run `npm run build` locally first
   - Check for TypeScript errors
   - Ensure all dependencies are in package.json

4. **API Route Errors**
   - Check Vercel function logs
   - Verify environment variables are set
   - Test database connectivity

## Environment Variables Quick Reference

Copy this to your Vercel dashboard environment variables:

```
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.offnmpuiogbuxbmhgdck.supabase.co:5432/postgres?schema=public&pgbouncer=true
NEXT_PUBLIC_SUPABASE_URL=https://offnmpuiogbuxbmhgdck.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mZm5tcHVpb2didXhibWhnZGNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NDUzMjcsImV4cCI6MjA4NzAyMTMyN30.WfG50Ggic4gnCVDxYUmXiBK5waxlZsOlg9aJ_85s5JM
SUPABASE_SERVICE_ROLE_KEY=[GET_FROM_SUPABASE_DASHBOARD]
NEXTAUTH_SECRET=[GENERATE_RANDOM_STRING]
NEXTAUTH_URL=[YOUR_VERCEL_APP_URL]
NEXT_PUBLIC_APP_URL=[YOUR_VERCEL_APP_URL]
NEXT_PUBLIC_ENABLE_DRY_RUN=false
NEXT_PUBLIC_ENABLE_SOCIAL_SHARING=true
NEXT_PUBLIC_ENABLE_REALTIME=true
```

## Post-Deployment

1. **Set up custom domain** (optional)
2. **Configure analytics** (optional)
3. **Set up monitoring** (recommended)
4. **Configure backup strategy** (recommended)

## Support

If you encounter issues:
1. Check Vercel function logs
2. Verify environment variables
3. Test database connectivity
4. Check Supabase logs

Happy deploying! 🚀