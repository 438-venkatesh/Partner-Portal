# Quick Start - View Onboarding Flows with Mock Data 🚀

## Step 1: Initialize Mock Data

You have **two options** to populate the database with sample partners, suppliers, and logistics partners:

### Option A: Via Seed Script (Recommended)
```bash
cd apps/backend
pnpm db:seed
```

### Option B: Via API Endpoint
1. Start the backend server:
   ```bash
   cd apps/backend
   pnpm dev
   ```

2. In another terminal or using a tool like Postman/curl:
   ```bash
   curl -X POST http://localhost:3000/api/mock-data/init \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer your-token-here"
   ```

   Or use the browser console:
   ```javascript
   fetch('http://localhost:3000/api/mock-data/init', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
     }
   }).then(r => r.json()).then(console.log);
   ```

## Step 2: Start the Application

### Terminal 1: Backend Server
```bash
cd apps/backend
pnpm dev
```

### Terminal 2: Frontend Server
```bash
cd apps/frontend
pnpm dev
```

## Step 3: View Onboarding Flows

1. **Navigate to Partners List**:
   - Open `http://localhost:5173/partners`
   - You'll see 6 sample partners

2. **View Partner Onboarding**:
   - Click on any partner (e.g., "Digital Marketing Agency")
   - Click the **"Onboarding"** tab
   - You'll see the partner onboarding workflow with 11 stages

3. **View Supplier Onboarding**:
   - Click on "Global Manufacturing Supplies Ltd." (Supplier partner)
   - Click the **"Onboarding"** tab
   - You'll see the supplier onboarding workflow with 8 stages

4. **View Logistics Onboarding**:
   - Click on "Express Logistics Services" (Logistics partner)
   - Click the **"Onboarding"** tab
   - You'll see the logistics onboarding workflow with 9 stages

5. **View Combined Workflows**:
   - Click on "Complete Supply Chain Solutions" (Supplier+Logistics)
   - Click the **"Onboarding"** tab
   - You'll see both supplier and logistics onboarding workflows

## Sample Data Created

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

### Additional Data
- 2 Suppliers (linked to supplier partners)
- 2 Logistics Partners (linked to logistics partners)
- 6 Partner Onboarding Workflows
- 2 Supplier Onboarding Workflows
- 2 Logistics Onboarding Workflows

## Onboarding Stages Overview

### Partner Onboarding (11 stages)
1. Registration
2. Service Selection
3. Initial Review
4. Documentation
5. Verification
6. Agreement
7. App Access
8. User Setup
9. Training
10. Testing
11. Go Live

### Supplier Onboarding (8 stages)
1. Supplier Registration
2. Catalog Setup
3. Supplier Documentation
4. Supplier Verification
5. Supplier Agreement
6. Payment Setup
7. Supplier Portal Access
8. Supplier Activation

### Logistics Onboarding (9 stages)
1. Logistics Registration
2. Fleet Setup
3. Logistics Documentation
4. Logistics Verification
5. Logistics Agreement
6. API Integration
7. Logistics Portal Access
8. Logistics Testing
9. Logistics Activation

## Troubleshooting

### Database Connection Error
If you see database connection errors:
1. Ensure PostgreSQL is running
2. Set `DATABASE_URL` in `apps/backend/.env`:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/partner_portal
   ```

### No Partners Showing
- Run the seed script: `pnpm db:seed`
- Or call the API endpoint: `POST /api/mock-data/init`

### Onboarding Tab Not Showing
- Ensure the partner has an onboarding workflow initialized
- Check browser console for errors
- Verify backend server is running

## Next Steps

After viewing the onboarding flows:
- ✅ Test stage updates (mark stages as completed)
- ✅ View different onboarding stages (early, mid, advanced)
- ✅ Test supplier-specific workflows
- ✅ Test logistics-specific workflows
- ✅ Explore other partner modules (documents, performance, services)









