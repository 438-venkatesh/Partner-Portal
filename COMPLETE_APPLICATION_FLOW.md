# Partner Portal - Complete Application Flow Documentation

**Last Updated**: January 2025  
**Version**: 1.0

---

## 📋 Table of Contents

1. [Application Overview](#application-overview)
2. [User Journey Flows](#user-journey-flows)
3. [Authentication & Registration Flow](#authentication--registration-flow)
4. [Dashboard & Navigation](#dashboard--navigation)
5. [Feature Flows](#feature-flows)
6. [Technical Architecture](#technical-architecture)
7. [API Endpoints Reference](#api-endpoints-reference)
8. [Database Schema](#database-schema)
9. [Component Structure](#component-structure)

---

## 🎯 Application Overview

The Partner Portal is a self-service application that allows partner organizations to:
- Register and manage their organization
- Onboard and manage employees
- View and manage access to multiple tenant organizations
- Track service timelines and due dates
- Manage service delivery deadlines

### Key Features
- ✅ Partner Self-Registration (4-step stepper form)
- ✅ Email Verification Workflow
- ✅ Partner Authentication (Separate from main app)
- ✅ Dashboard with Statistics & Metrics
- ✅ Service Timeline Management
- ✅ Employee Management
- ✅ Tenant Detail Views
- ✅ Password Reset Flow
- ✅ Settings Management

---

## 👤 User Journey Flows

### Flow 1: New Partner Registration

```
1. Access Registration Page
   URL: /partner/register
   
2. Step 1: Company Information
   - Company Name (required)
   - Display Name (optional)
   - Website (optional, validated as URL)
   - Description (optional)
   
3. Step 2: Partner Details
   - Partner Type (required): Agency, Reseller, Integrator, Consultant, Affiliate, Supplier, Logistics Partner, Supplier Logistics
   - Business Type (optional): B2B, B2C, Both
   
4. Step 3: Admin Account
   - Email (required, validated)
   - Password (required, min 8 chars, uppercase, lowercase, number)
   - Confirm Password (required, must match)
   - First Name (optional)
   - Last Name (optional)
   - Phone (optional)
   
5. Step 4: Review & Submit
   - Review all entered information
   - Submit registration
   
6. Registration Success
   - Account created with status: 'pending_verification'
   - Email verification token generated
   - Redirect to login page
   - Email sent (TODO: integrate email service)
```

### Flow 2: Email Verification

```
1. Partner receives verification email
   - Contains verification link with token
   
2. Click verification link
   URL: /partner/verify-email/:token
   
3. Backend Verification
   - Validates token
   - Checks expiration (24 hours)
   - Updates account status to 'active'
   - Sets emailVerified to true
   
4. Success
   - Account activated
   - Redirect to login page
   - Can now login
```

### Flow 3: Partner Login

```
1. Access Login Page
   URL: /partner/login
   
2. Enter Credentials
   - Email (required)
   - Password (required)
   
3. Authentication
   - Backend validates credentials
   - Checks account status (must be 'active')
   - Checks emailVerified (must be true)
   - Generates JWT token (7-day expiry)
   
4. Success
   - Token stored in localStorage ('partner_auth_token')
   - User data stored in Zustand store
   - Redirect to /partner/dashboard
   
5. Failure
   - Error message displayed
   - Link to forgot password
   - Link to registration
```

### Flow 4: Password Reset

```
1. Forgot Password
   URL: /partner/forgot-password
   - Enter email address
   - Submit request
   
2. Email Sent
   - Reset token generated (1-hour expiry)
   - Email sent with reset link
   - Success message displayed
   
3. Reset Password
   URL: /partner/reset-password/:token
   - Enter new password
   - Confirm password
   - Submit
   
4. Password Updated
   - Token validated
   - Password hashed and updated
   - Redirect to login
```

---

## 🏠 Dashboard & Navigation

### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  Sidebar (256px)        │  Main Content Area            │
│                         │                               │
│  ┌──────────────────┐  │  ┌──────────────────────────┐ │
│  │ Partner Portal    │  │  │ Header: Dashboard        │ │
│  │ Logo             │  │  │        [Logout Button]    │ │
│  └──────────────────┘  │  └──────────────────────────┘ │
│                         │                               │
│  ┌──────────────────┐  │  ┌──────────────────────────┐ │
│  │ User Info        │  │  │                          │ │
│  │ - Name           │  │  │  Dashboard Content       │ │
│  │ - Organization   │  │  │  - Stats Cards          │ │
│  └──────────────────┘  │  │  - Client List          │ │
│                         │  │  - Service Timelines     │ │
│  ▼ Overview             │  │                          │ │
│    • Dashboard          │  │                          │ │
│                         │  └──────────────────────────┘ │
│  ▼ Client Management    │                               │
│    • Service Timelines  │                               │
│      [Badge: Overdue]   │                               │
│                         │                               │
│  ▼ Organization         │                               │
│    • Employees          │                               │
│    • Settings           │                               │
│                         │                               │
│  ┌──────────────────┐  │                               │
│  │ [Logout Button]  │  │                               │
│  └──────────────────┘  │                               │
└─────────────────────────────────────────────────────────┘
```

### Navigation Sections

#### 1. Overview Section
- **Dashboard** (`/partner/dashboard`)
  - Main landing page after login
  - Shows statistics and overview

#### 2. Client Management Section
- **Service Timelines** (`/partner/timelines`)
  - View all service timelines
  - Create new timelines
  - Edit existing timelines
  - Update timeline status
  - Badge shows overdue count

#### 3. Organization Section
- **Employees** (`/partner/employees`)
  - List all employees
  - Invite new employees
  - Resend invitations
  - Update employee details
  - Remove employees

- **Settings** (`/partner/settings`)
  - Account information
  - Organization settings
  - Change password

---

## 📊 Dashboard Flow

### Dashboard Page (`/partner/dashboard`)

```
1. Page Load
   - Fetches dashboard statistics
   - Fetches accessible tenants
   - Fetches service timelines
   
2. Statistics Cards (Top Row)
   ├─ Active Clients
   │  └─ Count of unique tenant organizations
   ├─ Total Relationships
   │  └─ Count of active service relationships
   ├─ Upcoming Due Dates
   │  └─ Count of timelines due in next 30 days
   └─ Overdue Items
      └─ Count of overdue timelines (red highlight)
   
3. Quick Action Buttons
   ├─ Create Timeline → Navigate to timelines page
   ├─ Invite Employee → Navigate to employees page
   └─ View All Timelines → Navigate to timelines page
   
4. Your Clients Section (Left)
   - Lists all accessible tenant organizations
   - Shows service count per tenant
   - Click tenant → Navigate to tenant detail page
   - "View All" button (if multiple tenants)
   
5. Service Timelines Section (Right)
   - Shows up to 10 upcoming timelines
   - Displays due date status (overdue, today, tomorrow, upcoming)
   - Shows priority badges
   - Shows status indicators
   - "View All" button → Navigate to timelines page
   
6. Overdue Items Alert (If any)
   - Red-bordered card
   - Lists all overdue timelines
   - "View Timeline" button → Navigate to timelines page
```

---

## 🔄 Feature Flows

### Feature 1: Service Timeline Management

#### View All Timelines (`/partner/timelines`)

```
1. Page Load
   - Fetches all service timelines
   - Filters can be applied (tenant, status, date range)
   
2. Timeline List
   - Each timeline shows:
     • Title
     • Description
     • Service Type
     • Tenant ID
     • Due Date
     • Priority (low, medium, high, urgent)
     • Status (pending, in_progress, completed, overdue, cancelled)
     • Due Date Status Badge
   
3. Actions Per Timeline
   ├─ Status Dropdown
   │  └─ Quick status update (pending → in_progress → completed)
   └─ Edit Button
      └─ Opens edit dialog
   
4. Create Timeline Button
   └─ Opens create timeline dialog
```

#### Create Timeline Flow

```
1. Click "Create Timeline" Button
   └─ Opens CreateTimelineDialog
   
2. Form Fields
   ├─ Tenant Selection (dropdown)
   │  └─ Shows all accessible tenants
   ├─ Service Relationship (dropdown)
   │  └─ Shows relationships for selected tenant
   ├─ Service Selection (dropdown)
   │  └─ Shows services from selected relationship
   ├─ Service Type (text input)
   │  └─ e.g., "auditing", "fax_filing", "maintenance"
   ├─ Title (required)
   ├─ Description (optional)
   ├─ Due Date (datetime picker, required)
   ├─ Priority (dropdown: low, medium, high, urgent)
   ├─ Recurrence Type (dropdown: none, daily, weekly, monthly, quarterly, yearly)
   ├─ Recurrence Interval (if recurrence selected)
   └─ Notes (optional)
   
3. Submit
   - Validates all required fields
   - Creates timeline in database
   - Calculates next due date if recurring
   - Updates dashboard stats
   - Closes dialog
   - Refreshes timeline list
```

#### Edit Timeline Flow

```
1. Click Edit Button on Timeline
   └─ Opens EditTimelineDialog
   
2. Form Fields (Pre-filled)
   ├─ Title
   ├─ Description
   ├─ Due Date
   ├─ Status (dropdown)
   ├─ Priority (dropdown)
   └─ Notes
   
3. Submit
   - Updates timeline in database
   - If status changed to 'completed', sets completedDate
   - If recurring, calculates next due date
   - Updates dashboard stats
   - Closes dialog
   - Refreshes timeline list
```

#### Update Timeline Status Flow

```
1. Select Status from Dropdown
   - Options: pending, in_progress, completed, cancelled
   
2. Auto-Update
   - If status = 'completed':
     • Sets completedDate to current date
     • Calculates next due date if recurring
   - Updates timeline in database
   - Refreshes timeline list
   - Updates dashboard stats
```

### Feature 2: Employee Management

#### Employee List (`/partner/employees`)

```
1. Page Load
   - Fetches all employees for the partner
   - Displays employee cards
   
2. Employee Card Shows
   ├─ Avatar/Icon
   ├─ Name (or email if name not set)
   ├─ Email
   ├─ Phone (if available)
   ├─ Status Badge
   │  ├─ Active (green) - if status='active' and emailVerified
   │  ├─ Pending Verification (gray)
   │  ├─ Suspended (red)
   │  └─ Inactive (outline)
   ├─ Last Login Date (if available)
   └─ Actions Menu (⋮)
      ├─ Resend Invitation (if pending)
      └─ Remove Employee
```

#### Invite Employee Flow

```
1. Click "Invite Employee" Button
   └─ Opens InviteEmployeeDialog
   
2. Form Fields
   ├─ Email (required, validated)
   ├─ First Name (optional)
   ├─ Last Name (optional)
   └─ Phone (optional)
   
3. Submit
   - Creates partnerUserAccount with:
     • Status: 'pending_verification'
     • Email verification token generated
     • Expires in 24 hours
   - Creates partnerUser entry
   - Sends invitation email (TODO: integrate email service)
   - Closes dialog
   - Refreshes employee list
```

#### Resend Invitation Flow

```
1. Click "Resend Invitation" from Actions Menu
   
2. Backend Process
   - Generates new verification token
   - Sets new expiration (24 hours)
   - Resets status to 'pending_verification'
   - Sends new invitation email
   
3. Success
   - Toast notification
   - Employee list refreshed
```

#### Remove Employee Flow

```
1. Click "Remove Employee" from Actions Menu
   └─ Confirmation dialog appears
   
2. Confirm
   - Updates partnerUserAccount:
     • Status: 'deleted'
     • emailVerified: false
   - Updates partnerUser:
     • Status: 'inactive'
   - Refreshes employee list
```

### Feature 3: Tenant Detail View

#### Tenant Detail Page (`/partner/tenants/:tenantId`)

```
1. Navigate from Dashboard
   - Click on tenant card in "Your Clients" section
   - Or navigate directly via URL
   
2. Page Load
   - Fetches tenant details
   - Fetches service relationships
   - Fetches service timelines for tenant
   
3. Statistics Cards (Top Row)
   ├─ Service Relationships Count
   ├─ Active Timelines Count
   └─ Total Timelines Count
   
4. Service Relationships Section (Left)
   - Lists all active relationships
   - Shows:
     • Relationship ID
     • Start Date
     • Approved Services Count
   - Click relationship → View details (future enhancement)
   
5. Service Timelines Section (Right)
   - Lists all timelines for this tenant
   - Shows:
     • Title
     • Description
     • Service Type
     • Due Date
     • Status
     • Priority
     • Due Date Status Badge
   - Scrollable list (max height: 600px)
   
6. Back Button
   └─ Returns to dashboard
```

### Feature 4: Settings Management

#### Settings Page (`/partner/settings`)

```
1. Navigation
   - Click "Settings" in sidebar
   - URL: /partner/settings
   
2. Tabbed Interface
   ├─ Account Tab
   │  └─ Displays:
   │     • Email (read-only)
   │     • Name (read-only)
   │     • Partner Organization (read-only)
   │
   ├─ Organization Tab
   │  └─ Placeholder:
   │     • "Organization settings management will be available soon"
   │     • "Contact your platform administrator"
   │
   └─ Security Tab
      └─ Change Password Form:
         • Current Password (required)
         • New Password (required, validated)
         • Confirm Password (required, must match)
         • Submit button
```

#### Change Password Flow

```
1. Navigate to Settings → Security Tab
   
2. Enter Current Password
   - Validates against stored hash
   
3. Enter New Password
   - Must be at least 8 characters
   - Must contain uppercase letter
   - Must contain lowercase letter
   - Must contain number
   
4. Confirm Password
   - Must match new password
   
5. Submit
   - Validates current password
   - Hashes new password
   - Updates password in database
   - Success notification
   - Form reset
```

---

## 🏗️ Technical Architecture

### Frontend Architecture

```
partner-portal-implementation/
├── apps/
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   └── partner/
│   │   │   │       ├── __root.tsx          # Root layout with auth guard
│   │   │   │       ├── register.tsx        # 4-step registration form
│   │   │   │       ├── login.tsx           # Login page
│   │   │   │       ├── verify-email.tsx    # Email verification
│   │   │   │       ├── forgot-password.tsx # Password reset request
│   │   │   │       ├── reset-password.$token.tsx # Password reset
│   │   │   │       ├── dashboard.tsx       # Main dashboard
│   │   │   │       ├── timelines.tsx       # Service timelines
│   │   │   │       ├── employees.tsx       # Employee management
│   │   │   │       ├── tenants.$tenantId.tsx # Tenant detail
│   │   │   │       └── settings.tsx        # Settings page
│   │   │   ├── components/
│   │   │   │   ├── layout/
│   │   │   │   │   ├── PartnerLayout.tsx  # Main layout with sidebar
│   │   │   │   │   └── PartnerSidebar.tsx  # Collapsible sidebar
│   │   │   │   └── partner/
│   │   │   │       └── CreateTimelineDialog.tsx # Timeline creation
│   │   │   ├── lib/
│   │   │   │   ├── api/
│   │   │   │   │   ├── partnerClient.ts    # Axios instance
│   │   │   │   │   ├── partnerAuth.ts      # Auth API
│   │   │   │   │   ├── partnerDashboard.ts # Dashboard API
│   │   │   │   │   └── partnerEmployees.ts # Employee API
│   │   │   │   └── stores/
│   │   │   │       └── partnerAuthStore.ts # Zustand store
│   │   │   └── components/ui/              # Shadcn UI components
│   │   └── package.json
│   │
│   └── backend/
│       ├── src/
│       │   ├── routes/
│       │   │   ├── partnerAuth.ts          # Auth routes
│       │   │   ├── partnerDashboard.ts     # Dashboard routes
│       │   │   └── partnerEmployees.ts     # Employee routes
│       │   ├── services/
│       │   │   ├── partnerAuthService.ts   # Auth logic
│       │   │   ├── partnerDashboardService.ts # Dashboard logic
│       │   │   └── partnerEmployeeService.ts # Employee logic
│       │   ├── middleware/
│       │   │   └── partnerAuth.ts          # JWT auth middleware
│       │   ├── db/
│       │   │   ├── schema/
│       │   │   │   ├── partnerAuth.ts      # Auth tables
│       │   │   │   └── partners.ts         # Partner tables
│       │   │   └── migrations/            # SQL migrations
│       │   └── index.ts                    # Fastify server
│       └── package.json
│
└── packages/
    └── common/                            # Shared types/schemas
```

### State Management

```
┌─────────────────────────────────────────┐
│  Zustand Store (partnerAuthStore)       │
│  - user: PartnerUser                    │
│  - token: string                        │
│  - setUser()                            │
│  - setToken()                           │
│  - logout()                             │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  React Query (Server State)             │
│  - Dashboard stats                      │
│  - Tenants list                         │
│  - Service timelines                   │
│  - Employees list                      │
│  - Mutations (create, update, delete)   │
└─────────────────────────────────────────┘
```

### Authentication Flow

```
┌──────────────┐
│   Browser    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Partner Login/Register             │
│  - Email/Password                   │
│  - JWT Token Generated              │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Token Storage                       │
│  - localStorage: 'partner_auth_token'│
│  - Zustand Store: user + token       │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  API Requests                        │
│  - Axios Interceptor                 │
│  - Adds: Authorization: Bearer <token>│
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Backend Middleware                  │
│  - Validates JWT                     │
│  - Extracts partnerId, accountId     │
│  - Attaches to request.partnerUser   │
└─────────────────────────────────────┘
```

---

## 🔌 API Endpoints Reference

### Public Endpoints (No Authentication)

#### Authentication
```
POST   /api/partner-auth/register
Body: {
  partnerName: string
  displayName?: string
  partnerType: enum
  businessType?: enum
  website?: string
  description?: string
  email: string
  password: string
  firstName?: string
  lastName?: string
  phone?: string
}
Response: { message, partnerId, accountId }

GET    /api/partner-auth/verify-email/:token
Response: { message }

POST   /api/partner-auth/login
Body: { email, password }
Response: { token, user }

POST   /api/partner-auth/forgot-password
Body: { email }
Response: { message }

POST   /api/partner-auth/reset-password
Body: { token, password }
Response: { message }
```

### Protected Endpoints (Require Partner Auth Token)

#### Current User
```
GET    /api/partner-auth/me
Response: { accountId, email, firstName, lastName, partnerId, partnerName, partnerStatus }
```

#### Password Management
```
POST   /api/partner-auth/change-password
Body: { currentPassword, newPassword }
Response: { message }
```

#### Dashboard
```
GET    /api/partner-dashboard/stats
Response: {
  activeClients: number
  totalRelationships: number
  upcomingDueDates: number
  overdueItems: number
  upcomingTimelines: ServiceTimeline[]
  overdueTimelines: ServiceTimeline[]
}

GET    /api/partner-dashboard/tenants
Response: { tenants: TenantAccess[] }

GET    /api/partner-dashboard/tenants/:tenantId
Response: {
  tenantId: string
  serviceCount: number
  activeTimelines: number
  relationships: Relationship[]
  timelines: ServiceTimeline[]
}
```

#### Service Timelines
```
GET    /api/partner-dashboard/timelines
Query: ?tenantId=&status=&dueDateFrom=&dueDateTo=
Response: { timelines: ServiceTimeline[] }

POST   /api/partner-dashboard/timelines
Body: {
  relationshipId: string
  tenantId: string
  serviceId: string
  serviceType: string
  title: string
  description?: string
  dueDate: string (ISO)
  priority?: enum
  recurrenceType?: enum
  recurrenceInterval?: string
  assignedTo?: string
  notes?: string
}
Response: ServiceTimeline

PUT    /api/partner-dashboard/timelines/:timelineId
Body: {
  title?: string
  description?: string
  dueDate?: string
  status?: enum
  priority?: enum
  notes?: string
}
Response: ServiceTimeline

PUT    /api/partner-dashboard/timelines/:timelineId/status
Body: { status: enum, completedDate?: string }
Response: ServiceTimeline
```

#### Employee Management
```
GET    /api/partner-employees
Response: { employees: PartnerEmployee[] }

POST   /api/partner-employees/invite
Body: {
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  role: string
}
Response: { employee, account }

GET    /api/partner-employees/:accountId
Response: PartnerEmployee

PUT    /api/partner-employees/:accountId
Body: {
  firstName?: string
  lastName?: string
  phone?: string
  role?: string
  status?: string
  accountStatus?: enum
}
Response: { employee, account }

POST   /api/partner-employees/:accountId/resend-invitation
Response: { message, emailVerificationToken }

DELETE /api/partner-employees/:accountId
Response: { message }
```

---

## 🗄️ Database Schema

### Core Tables

#### `partner_user_accounts`
```sql
- account_id (UUID, PK)
- partner_id (UUID, FK → partners)
- email (VARCHAR, UNIQUE)
- password_hash (VARCHAR)
- first_name (VARCHAR, nullable)
- last_name (VARCHAR, nullable)
- phone (VARCHAR, nullable)
- status (ENUM: pending_verification, active, suspended, inactive, deleted)
- email_verified (BOOLEAN)
- email_verification_token (VARCHAR, nullable)
- email_verification_expires (TIMESTAMP, nullable)
- password_reset_token (VARCHAR, nullable)
- password_reset_expires (TIMESTAMP, nullable)
- last_login_at (TIMESTAMP, nullable)
- last_login_ip (VARCHAR, nullable)
- failed_login_attempts (VARCHAR, default '0')
- locked_until (TIMESTAMP, nullable)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `service_timelines`
```sql
- timeline_id (UUID, PK)
- relationship_id (UUID, FK)
- partner_id (UUID, FK → partners)
- tenant_id (UUID)
- service_id (UUID)
- service_type (VARCHAR)
- title (VARCHAR)
- description (TEXT, nullable)
- due_date (TIMESTAMP)
- completed_date (TIMESTAMP, nullable)
- status (VARCHAR: pending, in_progress, completed, overdue, cancelled)
- priority (VARCHAR: low, medium, high, urgent)
- recurrence_type (VARCHAR: none, daily, weekly, monthly, quarterly, yearly)
- recurrence_interval (VARCHAR, nullable)
- next_due_date (TIMESTAMP, nullable)
- assigned_to (UUID, nullable)
- notes (TEXT, nullable)
- metadata (TEXT, nullable)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `partner_users`
```sql
- id (UUID, PK)
- partner_id (UUID, FK → partners)
- user_id (UUID, FK → partner_user_accounts.account_id)
- role (VARCHAR)
- is_primary_contact (BOOLEAN)
- is_billing_contact (BOOLEAN)
- is_technical_contact (BOOLEAN)
- status (VARCHAR: active, inactive, pending)
- invited_by (UUID, nullable)
- invited_at (TIMESTAMP, nullable)
- joined_at (TIMESTAMP, nullable)
- last_active_at (TIMESTAMP, nullable)
- created_at (TIMESTAMP)
```

#### `partners`
```sql
- partner_id (UUID, PK)
- tenant_id (UUID, nullable)
- partner_code (VARCHAR, UNIQUE)
- partner_name (VARCHAR)
- display_name (VARCHAR, nullable)
- partner_type (ENUM)
- business_type (VARCHAR, nullable)
- status (ENUM: pending, active, suspended, terminated, inactive)
- tier (VARCHAR, nullable)
- registration_date (TIMESTAMP)
- approval_date (TIMESTAMP, nullable)
- approved_by (UUID, nullable)
- logo_url (VARCHAR, nullable)
- website (VARCHAR, nullable)
- description (TEXT, nullable)
- metadata (JSONB)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

---

## 🧩 Component Structure

### Layout Components

#### `PartnerLayout.tsx`
- Main layout wrapper
- Contains sidebar and main content area
- Handles logout functionality
- Responsive (mobile sidebar in sheet)

#### `PartnerSidebar.tsx`
- Collapsible navigation sidebar
- Sections: Overview, Client Management, Organization
- User info display
- Logout button at bottom
- Active route highlighting
- Badge notifications

### Page Components

#### Registration (`register.tsx`)
- 4-step stepper form
- Step 1: Company Information
- Step 2: Partner Details
- Step 3: Admin Account
- Step 4: Review & Submit
- Inline Zod validation
- Local state management for form fields

#### Login (`login.tsx`)
- Email/password form
- Link to registration
- Link to forgot password
- Error handling

#### Dashboard (`dashboard.tsx`)
- Statistics cards (4 cards)
- Quick action buttons
- Client list section
- Service timelines section
- Overdue items alert

#### Timelines (`timelines.tsx`)
- Timeline list with filters
- Create timeline dialog
- Edit timeline dialog
- Status update dropdown
- Due date status indicators

#### Employees (`employees.tsx`)
- Employee list
- Invite employee dialog
- Employee actions menu
- Status badges

#### Tenant Detail (`tenants.$tenantId.tsx`)
- Tenant statistics
- Service relationships list
- Service timelines list
- Navigation back to dashboard

#### Settings (`settings.tsx`)
- Tabbed interface (Account, Organization, Security)
- Account information display
- Change password form

### Dialog Components

#### `CreateTimelineDialog.tsx`
- Tenant selection
- Relationship selection
- Service selection
- Timeline details form
- Recurrence options

---

## 🔐 Security & Permissions

### Authentication
- JWT tokens with 7-day expiry
- Password hashing with bcryptjs
- Email verification required before login
- Account status checks (must be 'active')
- Password reset with time-limited tokens

### Authorization
- Partner users can only see their own partner's data
- Tenant access filtered by service relationships
- Roles and permissions come from wrapper application
- Platform/tenant admins assign roles based on partner admin requests

### Data Isolation
- All queries filtered by `partnerId`
- Partner users cannot access other partners' data
- Tenant data only visible if service relationship exists

---

## 📱 Responsive Design

### Desktop (≥768px)
- Sidebar always visible (256px width)
- Main content area with margin-left
- Full navigation visible
- All features accessible

### Mobile (<768px)
- Sidebar hidden by default
- Hamburger menu button in header
- Sidebar opens in sheet overlay
- Compact navigation
- Touch-optimized buttons

---

## 🚀 Deployment Flow

### Development
```
1. Start Backend
   cd apps/backend
   npm run dev
   → Runs on http://localhost:3000

2. Start Frontend
   cd apps/frontend
   npm run dev
   → Runs on http://localhost:5173

3. Database
   - PostgreSQL (Neon or local)
   - Run migrations: npm run db:migrate
```

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Email service integrated
- [ ] JWT secret configured
- [ ] CORS configured
- [ ] Error logging setup
- [ ] Performance monitoring
- [ ] Security headers configured

---

## 📝 Key Implementation Notes

### Form Validation
- All forms use Zod schemas
- Inline validation with TanStack Form
- Real-time error display
- Consistent validation patterns

### Error Handling
- Toast notifications for user feedback
- Error boundaries for React errors
- API error handling with meaningful messages
- Loading states for async operations

### State Management
- Zustand for client-side state (auth)
- React Query for server state (data fetching)
- Optimistic updates where appropriate
- Cache invalidation on mutations

### Code Quality
- TypeScript throughout
- Consistent naming conventions
- Reusable components
- Proper separation of concerns

---

## 🎯 User Roles & Access

### Partner Admin
- Full access to partner organization
- Can invite/manage employees
- Can view all accessible tenants
- Can create/manage service timelines
- Can update organization settings

### Partner User
- Access based on roles from wrapper app
- Can view assigned tenants
- Can manage assigned service timelines
- Limited settings access

### Platform Admin (Wrapper App)
- Approves partner registrations
- Assigns roles to partner users
- Manages service relationships
- Controls tenant access

---

## 🔄 Integration Points

### Wrapper Application
- Partner approval workflow
- Role assignment
- Service relationship creation
- Tenant access management

### Email Service (TODO)
- Registration confirmation
- Email verification
- Password reset
- Employee invitations

### Future Integrations
- Calendar systems
- Notification services
- Analytics tracking
- Document storage

---

**End of Complete Application Flow Documentation**









