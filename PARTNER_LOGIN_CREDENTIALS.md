# Partner Portal - Login Credentials

## Test Account Credentials

**Email:** `test.partner@example.com`  
**Password:** `Test1234!`

---

## Setup Instructions

### Step 1: Create Test Account (if not exists)

```bash
cd partner-portal-implementation/apps/backend
npx tsx src/db/create-test-partner.ts
```

This will create a test partner account with:
- Partner Name: "Test Partner Organization"
- Email: test.partner@example.com
- Password: Test1234!
- Status: pending_verification (needs activation)

### Step 2: Activate Test Account

```bash
cd partner-portal-implementation/apps/backend
npx tsx src/db/activate-test-partner.ts
```

This will:
- Set account status to `active`
- Mark email as verified (`emailVerified: true`)
- Enable login functionality

### Step 3: Verify Account Status (Optional)

```bash
cd partner-portal-implementation/apps/backend
npx tsx src/db/check-test-partner.ts
```

This will show:
- Account status
- Email verification status
- Partner details
- Login readiness check

---

## Login URL

**Partner Portal Login:** `http://localhost:5173/partner/login`

---

## Troubleshooting

### If Login Fails:

1. **Check Account Status:**
   ```bash
   cd partner-portal-implementation/apps/backend
   npx tsx src/db/check-test-partner.ts
   ```

2. **Verify Account is Active:**
   - Status should be: `active`
   - Email Verified should be: `true`

3. **If Account is Not Active:**
   ```bash
   npx tsx src/db/activate-test-partner.ts
   ```

4. **Test Password:**
   ```bash
   npx tsx src/db/test-password.ts
   ```

5. **Test Login Function:**
   ```bash
   npx tsx src/db/test-login.ts
   ```

---

## Alternative: Create New Account via Registration

You can also create a new account via the registration form:

1. Navigate to: `http://localhost:5173/partner/register`
2. Fill out the 4-step registration form
3. After registration, you'll need to:
   - Verify email (or activate manually)
   - Then login with your credentials

---

## Account Details

**Test Account Information:**
- Email: `test.partner@example.com`
- Password: `Test1234!`
- First Name: Test
- Last Name: Admin
- Partner Name: Test Partner Organization
- Partner Type: Reseller
- Business Type: B2B

---

**Note:** Make sure the backend server is running before attempting to login!









