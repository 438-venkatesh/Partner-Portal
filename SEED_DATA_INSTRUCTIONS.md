# Seed Data Instructions

## Option 1: Database Seed Script (Recommended)

### Prerequisites
1. Ensure PostgreSQL database is running
2. Set `DATABASE_URL` environment variable in `.env` file:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/partner_portal
   ```

### Run Seed Script
```bash
cd apps/backend
pnpm db:seed
```

This will create:
- 6 Partners (different types and onboarding stages)
- 2 Suppliers
- 2 Logistics Partners
- All onboarding workflows initialized

## Option 2: Create via API (Alternative)

If database connection is not available, you can create sample data via API calls using the frontend or API client.

### Sample Partners to Create:

1. **Digital Marketing Agency** (Agency Partner)
   - Type: `agency`
   - Status: `pending`
   - Onboarding Stage: Early (registration completed, service_selection in progress)

2. **Tech Solutions Reseller** (Reseller Partner)
   - Type: `reseller`
   - Status: `pending`
   - Onboarding Stage: Mid (3 stages completed, documentation in progress)

3. **Global Manufacturing** (Supplier Partner)
   - Type: `supplier`
   - Status: `pending`
   - Onboarding Stage: Early (registration completed, catalog_setup in progress)

4. **Express Logistics** (Logistics Partner)
   - Type: `logistics_partner`
   - Status: `pending`
   - Onboarding Stage: Early (registration completed, fleet_setup in progress)

5. **Enterprise Integration** (Integrator Partner)
   - Type: `integrator`
   - Status: `pending`
   - Onboarding Stage: Advanced (9 stages completed, testing in progress)

6. **Supply Chain Solutions** (Supplier + Logistics)
   - Type: `supplier_logistics`
   - Status: `pending`
   - Onboarding Stage: Mid (multiple workflows)

## Quick Setup

1. **Set up database connection**:
   ```bash
   # Create .env file in apps/backend/
   echo "DATABASE_URL=postgresql://user:password@localhost:5432/partner_portal" > apps/backend/.env
   ```

2. **Run migrations** (if not already done):
   ```bash
   cd apps/backend
   pnpm db:migrate
   ```

3. **Run seed script**:
   ```bash
   pnpm db:seed
   ```

4. **Start backend server**:
   ```bash
   pnpm dev
   ```

5. **Start frontend** (in another terminal):
   ```bash
   cd apps/frontend
   pnpm dev
   ```

6. **View partners**:
   - Navigate to `/partners` in the frontend
   - Click on any partner to view details
   - Click on "Onboarding" tab to see the onboarding workflow

## Sample Data Created

The seed script creates partners at different onboarding stages so you can see:
- ✅ Early stage onboarding (just started)
- ✅ Mid stage onboarding (partially completed)
- ✅ Advanced stage onboarding (almost complete)
- ✅ Supplier onboarding workflows
- ✅ Logistics onboarding workflows









