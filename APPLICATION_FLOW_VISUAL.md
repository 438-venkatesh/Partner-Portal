# Partner Portal - Visual Flow Diagrams

## 🔄 Complete User Journey Map

```
┌─────────────────────────────────────────────────────────────────┐
│                    PARTNER PORTAL APPLICATION FLOW              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│  Entry Point    │
│  /partner/login │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│  New Partner?   │  │  Existing User? │
│  → Register     │  │  → Login        │
└────────┬────────┘  └────────┬────────┘
         │                    │
         ▼                    ▼
┌─────────────────┐  ┌─────────────────┐
│  Registration   │  │  Authentication │
│  (4 Steps)       │  │  (Email/Pass)   │
└────────┬────────┘  └────────┬────────┘
         │                    │
         ▼                    │
┌─────────────────┐          │
│  Email Verify   │          │
│  (Token Link)    │          │
└────────┬────────┘          │
         │                   │
         └─────────┬─────────┘
                   │
                   ▼
         ┌─────────────────┐
         │   Dashboard      │
         │  /partner/dash   │
         └────────┬─────────┘
                  │
        ┌─────────┼─────────┐
        │         │         │
        ▼         ▼         ▼
┌───────────┐ ┌──────────┐ ┌──────────┐
│ Timelines │ │Employees │ │ Settings │
└───────────┘ └──────────┘ └──────────┘
```

## 📋 Registration Flow (4 Steps)

```
Step 1: Company Information
┌─────────────────────────────────────┐
│ • Company Name (required)           │
│ • Display Name (optional)            │
│ • Website (optional, URL validated) │
│ • Description (optional)            │
└──────────────┬──────────────────────┘
               │ [Next]
               ▼
Step 2: Partner Details
┌─────────────────────────────────────┐
│ • Partner Type (required)           │
│   - Agency, Reseller, Integrator,   │
│     Consultant, Affiliate, etc.     │
│ • Business Type (optional)          │
│   - B2B, B2C, Both                 │
└──────────────┬──────────────────────┘
               │ [Next]
               ▼
Step 3: Admin Account
┌─────────────────────────────────────┐
│ • Email (required, validated)       │
│ • Password (required, min 8 chars)   │
│   - Must have uppercase             │
│   - Must have lowercase             │
│   - Must have number                │
│ • Confirm Password (required)      │
│ • First Name (optional)              │
│ • Last Name (optional)              │
│ • Phone (optional)                  │
└──────────────┬──────────────────────┘
               │ [Next]
               ▼
Step 4: Review & Submit
┌─────────────────────────────────────┐
│ • Review all information             │
│ • [Submit Registration]              │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Success!                           │
│  • Account created                  │
│  • Verification email sent          │
│  • Redirect to login                │
└─────────────────────────────────────┘
```

## 🏠 Dashboard Layout

```
┌──────────────────────────────────────────────────────────────┐
│  SIDEBAR (256px)    │  MAIN CONTENT AREA                      │
├─────────────────────┼─────────────────────────────────────────┤
│                     │  ┌──────────────────────────────────┐  │
│  Partner Portal     │  │  Header: Dashboard  [Logout]     │  │
│  [Logo]             │  └──────────────────────────────────┘  │
│                     │                                         │
│  ─────────────────  │  ┌──────────────────────────────────┐  │
│                     │  │  Quick Actions                    │  │
│  User Info          │  │  [+ Create Timeline]             │  │
│  • Name             │  │  [Invite Employee]               │  │
│  • Organization     │  │  [View All Timelines]            │  │
│  ─────────────────  │  └──────────────────────────────────┘  │
│                     │                                         │
│  ▼ Overview         │  ┌──────────────────────────────────┐  │
│    • Dashboard      │  │  Stats Cards (4)                 │  │
│                     │  │  [Active Clients] [Relationships]│  │
│  ▼ Client Mgmt      │  │  [Upcoming] [Overdue]            │  │
│    • Timelines [3]  │  └──────────────────────────────────┘  │
│                     │                                         │
│  ▼ Organization     │  ┌──────────────┬───────────────────┐  │
│    • Employees      │  │ Your Clients │ Service Timelines │  │
│    • Settings       │  │              │                   │  │
│                     │  │ • Tenant 1   │ • Timeline 1      │  │
│  ─────────────────  │  │ • Tenant 2   │ • Timeline 2      │  │
│                     │  │ • Tenant 3   │ • Timeline 3      │  │
│  [Logout]           │  │              │                   │  │
│                     │  └──────────────┴───────────────────┘  │
└─────────────────────┴─────────────────────────────────────────┘
```

## 🔐 Authentication States

```
┌─────────────────┐
│  Not Logged In  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│Register│ │ Login  │
└───┬────┘ └───┬────┘
    │          │
    ▼          │
┌──────────┐  │
│Pending   │  │
│Verification│ │
└─────┬────┘  │
      │       │
      ▼       │
┌──────────┐  │
│Email     │  │
│Verification│ │
└─────┬────┘  │
      │       │
      └───┬───┘
          │
          ▼
    ┌──────────┐
    │  Active  │
    │  Logged  │
    │  In      │
    └─────┬────┘
          │
          ▼
    ┌──────────┐
    │Dashboard │
    │Access    │
    └──────────┘
```

## 📊 Service Timeline Lifecycle

```
┌──────────────┐
│  Create      │
│  Timeline    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Pending     │
│  (Initial)   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  In Progress │
│  (Started)   │
└──────┬───────┘
       │
   ┌───┴───┐
   │       │
   ▼       ▼
┌──────┐ ┌────────┐
│Completed│ │Overdue│
└──────┘ └────────┘
   │
   ▼
┌──────────────┐
│  Recurring?  │
│  → Next Due  │
└──────────────┘
```

## 👥 Employee Invitation Flow

```
┌─────────────────┐
│  Invite Employee│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Create Account │
│  Status: Pending │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Send Email     │
│  (Verification) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Employee Clicks│
│  Verification   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Set Password  │
│  (First Login) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Status: Active │
│  Can Login      │
└─────────────────┘
```

## 🔄 Data Flow Architecture

```
┌─────────────┐
│   Browser   │
│  (React)    │
└──────┬──────┘
       │
       │ HTTP Requests
       │ (Axios)
       ▼
┌─────────────┐
│  API Client │
│  (partner   │
│  Client)    │
└──────┬──────┘
       │
       │ + JWT Token
       │ (Interceptor)
       ▼
┌─────────────┐
│  Fastify    │
│  Backend    │
└──────┬──────┘
       │
       │ Auth Middleware
       │ (JWT Validation)
       ▼
┌─────────────┐
│  Services   │
│  (Business  │
│   Logic)    │
└──────┬──────┘
       │
       │ Drizzle ORM
       ▼
┌─────────────┐
│ PostgreSQL  │
│  Database   │
└─────────────┘
```

---

## 🎯 Quick Reference: All Routes

### Public Routes
- `/partner/register` - Partner registration
- `/partner/login` - Partner login
- `/partner/verify-email` - Email verification page
- `/partner/forgot-password` - Password reset request
- `/partner/reset-password/:token` - Password reset

### Protected Routes (Require Auth)
- `/partner/dashboard` - Main dashboard
- `/partner/timelines` - Service timelines
- `/partner/employees` - Employee management
- `/partner/tenants/:tenantId` - Tenant detail view
- `/partner/settings` - Settings page

---

## 📱 Feature Access Matrix

| Feature | Partner Admin | Partner User | Notes |
|---------|--------------|--------------|-------|
| Dashboard | ✅ | ✅ | Filtered by access |
| View Tenants | ✅ | ✅ | Only accessible tenants |
| Create Timeline | ✅ | ✅ | Based on relationships |
| Edit Timeline | ✅ | ✅ | Own timelines |
| View Employees | ✅ | ✅ | Own organization |
| Invite Employee | ✅ | ❌ | Admin only |
| Manage Employees | ✅ | ❌ | Admin only |
| Change Password | ✅ | ✅ | Own account |
| View Settings | ✅ | ✅ | Own account |
| Update Org Settings | ✅ | ❌ | Admin only |

---

**End of Visual Flow Diagrams**









