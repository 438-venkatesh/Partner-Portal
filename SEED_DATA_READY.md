# Seed Data - Ready to Use! 🌱

## ✅ Seed Script Created

I've created a comprehensive seed script that will populate your database with sample partners, suppliers, and logistics partners at different onboarding stages.

## 📋 What Will Be Created

### Partners (6 total)
1. **Digital Marketing Agency Inc.** (Agency) - Early stage onboarding
2. **Tech Solutions Reseller** (Reseller) - Mid stage onboarding  
3. **Global Manufacturing Supplies Ltd.** (Supplier) - Early stage onboarding
4. **Express Logistics Services** (Logistics) - Early stage onboarding
5. **Enterprise Integration Solutions** (Integrator) - Advanced stage onboarding
6. **Complete Supply Chain Solutions** (Supplier+Logistics) - Mid stage onboarding

### Additional Data
- 2 Suppliers (linked to supplier partners)
- 2 Logistics Partners (linked to logistics partners)
- 6 Partner Onboarding Workflows (auto-initialized)
- 2 Supplier Onboarding Workflows
- 2 Logistics Onboarding Workflows

## 🚀 How to Run

### Prerequisites
1. **Set up database connection** in `apps/backend/.env`:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/partner_portal
   ```

2. **Run migrations** (if not already done):
   ```bash
   cd apps/backend
   pnpm db:migrate
   ```

### Run Seed Script
```bash
cd apps/backend
pnpm db:seed
```

## 📊 Onboarding Stages Created

The seed script creates partners at different stages so you can see various workflow states:

- **Early Stage** (1-2 stages completed):
  - Digital Marketing Agency
  - Global Manufacturing (Supplier)
  - Express Logistics

- **Mid Stage** (3-4 stages completed):
  - Tech Solutions Reseller
  - Complete Supply Chain Solutions

- **Advanced Stage** (9 stages completed):
  - Enterprise Integration Solutions

## 🎯 After Seeding

1. **Start the backend server**:
   ```bash
   cd apps/backend
   pnpm dev
   ```

2. **Start the frontend** (in another terminal):
   ```bash
   cd apps/frontend
   pnpm dev
   ```

3. **View partners**:
   - Navigate to `http://localhost:5173/partners`
   - Click on any partner to view details
   - Click the **"Onboarding"** tab to see the workflow

4. **Test different workflows**:
   - **Service Partners**: See 11-stage partner onboarding
   - **Suppliers**: See 8-stage supplier onboarding
   - **Logistics**: See 9-stage logistics onboarding

## 🔧 Troubleshooting

### Database Connection Error
If you see `SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string`:
- Check your `DATABASE_URL` in `.env` file
- Ensure PostgreSQL is running
- Verify database credentials are correct

### Alternative: API-Based Seeding
If database connection is not available, use the API-based seed script:
```bash
# Terminal 1: Start backend
cd apps/backend
pnpm dev

# Terminal 2: Run API seed
cd apps/backend
tsx src/db/seed-via-api.ts
```

## 📝 Files Created

- ✅ `apps/backend/src/db/seed.ts` - Main seed script
- ✅ `apps/backend/src/db/seed-via-api.ts` - Alternative API-based seed
- ✅ `DATABASE_SETUP.md` - Setup instructions
- ✅ `SEED_DATA_INSTRUCTIONS.md` - Detailed instructions

## ✨ Ready to Use!

Once you run the seed script, you'll have:
- ✅ Sample partners at different onboarding stages
- ✅ Supplier and logistics partners with their workflows
- ✅ Realistic data to test the onboarding flows
- ✅ Various workflow states to explore

**Next Step**: Set up your database connection and run `pnpm db:seed`!









