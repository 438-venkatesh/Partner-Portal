# Database Setup & Seed Data Instructions

## Quick Start

### 1. Set Up Database Connection

Create a `.env` file in `apps/backend/`:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/partner_portal
JWT_SECRET=your-secret-key-here
FRONTEND_URL=http://localhost:5173
PORT=3000
```

### 2. Run Database Migrations

```bash
cd apps/backend
pnpm db:migrate
```

### 3. Seed Sample Data

**Option A: Direct Database Seed (Recommended)**
```bash
cd apps/backend
pnpm db:seed
```

**Option B: API-Based Seed (If database connection not available)**
```bash
# Terminal 1: Start backend server
cd apps/backend
pnpm dev

# Terminal 2: Run API seed script
cd apps/backend
# Set AUTH_TOKEN environment variable or update seed-via-api.ts
tsx src/db/seed-via-api.ts
```

## Sample Data Created

The seed script creates:

### Partners (6 total)
1. **Digital Marketing Agency Inc.** (Agency)
   - Onboarding Stage: Early (registration completed, service_selection in progress)

2. **Tech Solutions Reseller** (Reseller)
   - Onboarding Stage: Mid (3 stages completed, documentation in progress)

3. **Global Manufacturing Supplies Ltd.** (Supplier)
   - Onboarding Stage: Early (registration completed, catalog_setup in progress)
   - Has Supplier Onboarding Workflow

4. **Express Logistics Services** (Logistics)
   - Onboarding Stage: Early (registration completed, fleet_setup in progress)
   - Has Logistics Onboarding Workflow

5. **Enterprise Integration Solutions** (Integrator)
   - Onboarding Stage: Advanced (9 stages completed, testing in progress)

6. **Complete Supply Chain Solutions** (Supplier + Logistics)
   - Onboarding Stage: Mid (multiple workflows)
   - Has both Supplier and Logistics Onboarding Workflows

### Suppliers (2)
- Global Manufacturing Supplies Ltd.
- Complete Supply Chain Solutions

### Logistics Partners (2)
- Express Logistics Services
- Complete Supply Chain Solutions

## Viewing Onboarding Flows

1. **Start the application**:
   ```bash
   # Terminal 1: Backend
   cd apps/backend
   pnpm dev

   # Terminal 2: Frontend
   cd apps/frontend
   pnpm dev
   ```

2. **Navigate to Partners**:
   - Go to `http://localhost:5173/partners`
   - Click on any partner to view details
   - Click on the "Onboarding" tab to see the workflow

3. **Test Different Stages**:
   - **Early Stage**: Digital Marketing Agency, Global Manufacturing, Express Logistics
   - **Mid Stage**: Tech Solutions Reseller, Complete Supply Chain Solutions
   - **Advanced Stage**: Enterprise Integration Solutions

## Troubleshooting

### Database Connection Error
- Ensure PostgreSQL is running
- Verify `DATABASE_URL` in `.env` file
- Check database credentials

### Migration Errors
- Ensure database exists
- Run migrations: `pnpm db:migrate`
- Check database permissions

### Seed Script Errors
- Verify database connection
- Check schema matches migrations
- Ensure all required tables exist

## Next Steps

After seeding:
1. ✅ View partners in the UI
2. ✅ Check onboarding workflows
3. ✅ Test stage updates
4. ✅ View supplier/logistics specific workflows
5. ✅ Test different onboarding stages









