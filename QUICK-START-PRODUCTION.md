# 🚀 Quick Start: Vercel + Supabase Production Deployment

## **1-Minute Setup**

Ready to deploy your cricket bidding platform? Follow these steps:

### **Step 1: Run the Setup Script**
```bash
npm run setup:production
```

This automated script will:
- ✅ Check dependencies
- ✅ Guide you through Supabase setup
- ✅ Configure Vercel project
- ✅ Set all environment variables
- ✅ Deploy to production

### **Step 2: Manual Steps (5 minutes)**

**🗄️ Supabase Setup:**
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Name: `cricketbid-production`
4. Choose region closest to your users
5. Wait for project to be ready (2-3 minutes)

**📋 Get Credentials:**
- Go to Settings → API
- Copy Project URL, anon key, service_role key
- Go to Settings → Database
- Copy connection string (for DATABASE_URL)

**That's it!** The script handles everything else.

---

## **Alternative: Manual Setup**

If you prefer manual setup:

### **1. Install Vercel CLI**
```bash
npm install -g vercel
```

### **2. Setup Supabase Production Project**
- Create separate production project (recommended)
- Copy credentials from Settings → API

### **3. Deploy Database Schema**
```bash
export DATABASE_URL="your-production-url"
npx prisma db push
```

### **4. Configure Vercel**
```bash
vercel login
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add DATABASE_URL production
# ... add all environment variables
```

### **5. Deploy**
```bash
vercel --prod
```

---

## **Environment Variables Needed**

```bash
DATABASE_URL                    # From Supabase Settings → Database
NEXT_PUBLIC_SUPABASE_URL       # From Supabase Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY  # From Supabase Settings → API
SUPABASE_SERVICE_ROLE_KEY      # From Supabase Settings → API
NEXTAUTH_URL                   # https://your-domain.com
NEXTAUTH_SECRET               # Auto-generated secure secret
NEXT_PUBLIC_APP_URL           # https://your-domain.com
```

---

## **Post-Deployment Checklist**

- [ ] **Test Health Check**: Visit `https://your-app.vercel.app/api/health`
- [ ] **Test Authentication**: Sign up/login works
- [ ] **Test Database**: Create auction, add players
- [ ] **Check Security**: All API endpoints protected
- [ ] **Setup Monitoring**: Check Vercel + Supabase dashboards
- [ ] **Custom Domain**: Add your domain (optional)

---

## **Production URLs**

After deployment, you'll have:
- **App**: `https://your-app.vercel.app`
- **Health Check**: `https://your-app.vercel.app/api/health`
- **Admin Dashboard**: `https://your-app.vercel.app/dashboard`
- **Vercel Dashboard**: `https://vercel.com/dashboard`
- **Supabase Dashboard**: `https://supabase.com/dashboard`

---

## **Cost Breakdown**

- **Vercel Pro**: $20/month (auto-scaling, custom domains, analytics)
- **Supabase Pro**: $25/month (500MB database, 100GB bandwidth)
- **Total**: **~$45/month** for production-ready platform

---

## **Need Help?**

1. **Build Issues**: Run `npm run type-check` to fix TypeScript errors
2. **Database Issues**: Check DATABASE_URL format and SSL requirements
3. **Auth Issues**: Verify NEXTAUTH_SECRET and NEXTAUTH_URL are correct
4. **Performance**: Check `/api/health` and `/api/metrics` endpoints

---

**🎉 Your cricket bidding platform will be live in under 10 minutes!**