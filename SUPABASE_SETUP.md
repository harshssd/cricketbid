# Supabase Setup Guide for CricketBid

This guide explains how to set up Supabase for both local development and production.

## Local Development Setup

For local development, we're using Prisma with a local PostgreSQL database. The Supabase middleware is disabled when using placeholder URLs.

### Current Local Setup:
- Database: Prisma local PostgreSQL (running on port 51213)
- Authentication: Placeholder (will be replaced with Supabase Auth in production)
- Real-time: Disabled for local development

## Production Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Choose a region close to your users
4. Set a strong database password

### 2. Get Project Credentials

From your Supabase dashboard:
- **Project URL**: Found in Settings > API
- **Anon Key**: Found in Settings > API
- **Service Role Key**: Found in Settings > API (keep secret!)

### 3. Update Environment Variables

Create `.env.production` or update your deployment platform with:

```bash
# Supabase Production
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Database for Prisma (optional - can use Supabase's PostgreSQL directly)
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[your-project-ref].supabase.co:5432/postgres"
```

### 4. Run Database Migrations

#### Option A: Using Supabase CLI (Recommended)
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

#### Option B: Using SQL Editor
1. Go to your Supabase dashboard
2. Open the SQL Editor
3. Copy and paste the content from `supabase/migrations/0001_initial_schema.sql`
4. Run the migration
5. Copy and paste the content from `supabase/seed.sql`
6. Run the seed data

### 5. Configure Authentication

In your Supabase dashboard:

1. **Authentication > Settings**:
   - Set Site URL: `https://your-domain.com`
   - Add redirect URLs for production

2. **Authentication > Providers**:
   - Enable email authentication
   - Configure OAuth providers (Google, GitHub) if needed

3. **Authentication > Email Templates**:
   - Customize email templates if needed

### 6. Set up Row Level Security (RLS)

The migration already includes RLS policies, but verify in:
- **Authentication > Policies**

Key policies include:
- Users can only access their own profile
- Auction visibility based on public/private settings
- Captains can only see their own bids
- Owners can manage their auctions

### 7. Configure Realtime (Optional)

For live auction features:
1. **Database > Replication**
2. Enable replication for tables that need real-time updates:
   - `auctions`
   - `rounds`
   - `bids`
   - `auction_results`

### 8. Storage (Optional)

For file uploads (logos, player photos):
1. **Storage**
2. Create buckets:
   - `auction-logos`
   - `team-logos`
   - `player-images`
3. Set appropriate policies

## Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| Database | Prisma Local PostgreSQL | Supabase PostgreSQL |
| Auth | Placeholder/Disabled | Supabase Auth |
| Real-time | Disabled | Supabase Realtime |
| Storage | Local filesystem | Supabase Storage |
| Middleware | Skipped (placeholder URLs) | Full Supabase middleware |

## Environment Variables Summary

### Development (.env)
```bash
DATABASE_URL="prisma+postgres://localhost:51213/..."
NEXT_PUBLIC_SUPABASE_URL="https://placeholder.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="placeholder-anon-key"
```

### Production (.env.production)
```bash
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-real-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
DATABASE_URL="postgresql://postgres:password@db.project.supabase.co:5432/postgres"
```

## Simulation Data Storage

For the dry run simulator, we have these options:

### Option 1: Supabase Production (Recommended)
- Store simulation results in `dry_runs` table
- Use TTL for temporary simulations
- Scale with your application

### Option 2: Local Browser Storage
- Use IndexedDB for client-side storage
- No server cost for simulations
- Limited by browser storage

### Option 3: Hybrid Approach
- Temporary simulations in browser
- Saved simulations in Supabase
- Best of both worlds

## Migration Path

1. **Phase 1**: Local development with Prisma ✅
2. **Phase 2**: Production deployment with Supabase
3. **Phase 3**: Enable real-time features
4. **Phase 4**: Add file storage and advanced features

## Security Checklist

- [ ] RLS policies configured
- [ ] Service role key kept secret
- [ ] HTTPS enforced in production
- [ ] Email confirmations enabled
- [ ] Rate limiting configured
- [ ] CORS settings reviewed