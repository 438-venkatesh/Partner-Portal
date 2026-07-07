# Application Logical Flow - User Roles

## Overview

This application supports **two distinct user role systems** with separate authentication flows:

1. **Platform Admin/Operations Manager** - Manages partners, suppliers, and logistics
2. **Partner User** - Partner portal access for managing their own operations

---

## 🔐 Authentication Architecture

### Two Separate Authentication Systems

#### 1. **Admin/Platform Authentication**
- **Store**: `useAuthStore` (Zustand)
- **Token Storage**: `localStorage.getItem('auth_token')`
- **API Client**: `apiClient` (from `client.ts`)
- **Middleware**: `authenticate` (backend)
- **User Interface**: `User` type with `userId`, `email`, `role`, `tenantId`, `partnerId`, `supplierId`, `logisticsId`

#### 2. **Partner Authentication**
- **Store**: `usePartnerAuthStore` (Zustand)
- **Token Storage**: `localStorage.getItem('partner_auth_token')`
- **API Client**: `partnerApiClient` (from `partnerClient.ts`)
- **Middleware**: `authenticatePartner` (backend)
- **User Interface**: `PartnerUser` type with `accountId`, `email`, `partnerId`, `partnerName`, `partnerStatus`

---

## 👥 User Role 1: Platform Admin / Operations Manager

### Route Prefix: `/partners`, `/suppliers`, `/logistics`

### Authentication Flow

```
1. User Access
   └─> Root route (/) redirects to /partners
   
2. Route Protection
   └─> __root.tsx checks pathname
       ├─> If starts with /partner → Skip admin layout (handled by partner routes)
       └─> Otherwise → Apply Layout component (AdminSidebar)
   
3. Current State
   └─> ⚠️ No admin login page exists yet
       └─> Backend allows mock user in development mode
       └─> Logout redirects to /partners (not login)
```

### Layout & Navigation

**Component**: `Layout.tsx` with `AdminSidebar.tsx`

**Sidebar Navigation Structure**:
```
Main
  └─ Dashboard (/partners)

Partners
  └─ All Partners (/partners)

Suppliers
  ├─ Dashboard (/suppliers)
  ├─ Catalog (/suppliers/catalog)
  ├─ Purchase Orders (/suppliers/purchase-orders)
  └─ Invoices (/suppliers/invoices)

Logistics
  ├─ Dashboard (/logistics)
  └─ Shipments (/logistics/shipments)
```

### Accessible Routes

- `/partners` - Partner management dashboard
- `/partners/new` - Create new partner
- `/partners/:partnerId` - Partner details
- `/partners/:partnerId/edit` - Edit partner
- `/suppliers/*` - Supplier management
- `/logistics/*` - Logistics management

### Backend API Endpoints

**Base URL**: `/api`
**Authentication**: Bearer token from `auth_token`
**Middleware**: `authenticate` (allows mock user in dev)

**Protected Routes**:
- `/api/partners/*` - Partner CRUD operations
- `/api/suppliers/*` - Supplier operations
- `/api/logistics/*` - Logistics operations
- `/api/documents/*` - Document management
- `/api/onboarding/*` - Partner onboarding
- `/api/performance/*` - Performance metrics
- `/api/services/*` - Service management
- `/api/products/*` - Product management
- `/api/invoices/*` - Invoice management

### User Flow Diagram

```
┌─────────────────┐
│  Access /       │
│  (redirects)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  /partners      │
│  (Admin Layout)  │
└────────┬────────┘
         │
         ├─> View Partners List
         ├─> Create/Edit Partners
         ├─> Manage Suppliers
         └─> Manage Logistics
```

---

## 🤝 User Role 2: Partner User

### Route Prefix: `/partner/*`

### Authentication Flow

```
1. Registration/Login
   └─> /partner/register - Partner registration
   └─> /partner/login - Partner login
   └─> /partner/verify-email/:token - Email verification
   └─> /partner/forgot-password - Password reset request
   └─> /partner/reset-password/:token - Password reset

2. Route Protection
   └─> /partner/__root.tsx beforeLoad hook
       ├─> Public routes: register, login, verify-email, forgot-password, reset-password/*
       └─> Protected routes: Check localStorage.getItem('partner_auth_token')
           ├─> Token exists → Allow access
           └─> No token → Redirect to /partner/login

3. Layout Application
   └─> PartnerRootLayout checks if auth page
       ├─> Auth pages → No layout (just Outlet)
       └─> Protected pages → Apply PartnerLayout (with PartnerSidebar)
```

### Layout & Navigation

**Component**: `PartnerLayout.tsx` with `PartnerSidebar.tsx`

**Sidebar Navigation Structure**:
```
Overview
  └─ Dashboard (/partner/dashboard)

Client Management
  └─ Service Timelines (/partner/timelines)
      └─ Badge: Overdue items count

Organization
  ├─ Employees (/partner/employees)
  └─ Settings (/partner/settings)
```

### Accessible Routes

**Public Routes** (No authentication required):
- `/partner/register` - Partner registration
- `/partner/login` - Partner login
- `/partner/verify-email` - Email verification
- `/partner/forgot-password` - Request password reset
- `/partner/reset-password/:token` - Reset password

**Protected Routes** (Requires authentication):
- `/partner/dashboard` - Partner dashboard
- `/partner/timelines` - Service timelines management
- `/partner/tenants/:tenantId` - Tenant/client details
- `/partner/employees` - Employee management
- `/partner/settings` - Partner settings

### Backend API Endpoints

**Base URL**: `/api`
**Authentication**: Bearer token from `partner_auth_token`
**Middleware**: `authenticatePartner` (validates partner JWT)

**Protected Routes**:
- `/api/partner-auth/*` - Authentication (register, login, password reset)
- `/api/partner-dashboard/*` - Dashboard data, stats, tenants, timelines
- `/api/partner-employees/*` - Employee management

### User Flow Diagram

```
┌──────────────────────┐
│  /partner/register   │
│  (Public)            │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Email Verification  │
│  /partner/verify-email│
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  /partner/login      │
│  (Public)            │
└──────────┬───────────┘
           │
           ├─> POST /api/partner-auth/login
           │   └─> Returns: { token, user }
           │
           ▼
┌──────────────────────┐
│  Store Token          │
│  localStorage        │
│  partner_auth_token  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  /partner/dashboard  │
│  (Protected)         │
│  PartnerLayout       │
└──────────┬───────────┘
           │
           ├─> View Dashboard Stats
           ├─> Manage Service Timelines
           ├─> View Tenants/Clients
           ├─> Manage Employees
           └─> Update Settings
```

---

## 🔄 Complete Application Flow

### Route Decision Tree

```
User accesses application
│
├─> Path starts with /partner?
│   │
│   ├─> YES → Partner Portal Flow
│   │   │
│   │   ├─> Public route? (register, login, verify-email, etc.)
│   │   │   └─> YES → Show auth page (no layout)
│   │   │
│   │   └─> Protected route?
│   │       ├─> Check partner_auth_token
│   │       ├─> Token exists → Show PartnerLayout with PartnerSidebar
│   │       └─> No token → Redirect to /partner/login
│   │
│   └─> NO → Admin/Platform Flow
│       │
│       └─> Show Layout with AdminSidebar
│           └─> Routes: /partners, /suppliers, /logistics
```

### Token Management

**Admin Token**:
- Storage: `localStorage.getItem('auth_token')`
- Header: `Authorization: Bearer <token>`
- Interceptor: `apiClient` adds token automatically
- Expiry: Handled by backend JWT verification

**Partner Token**:
- Storage: `localStorage.getItem('partner_auth_token')`
- Header: `Authorization: Bearer <token>`
- Interceptor: `partnerApiClient` adds token automatically
- Expiry: Handled by backend JWT verification

### Error Handling

**401 Unauthorized**:
- Admin routes → Clear `auth_token`, redirect to `/login` (not implemented yet)
- Partner routes → Clear `partner_auth_token`, redirect to `/partner/login`

**403 Forbidden**:
- Display error message
- User remains on current page

---

## 📊 User Role Comparison

| Feature | Platform Admin | Partner User |
|---------|---------------|--------------|
| **Route Prefix** | `/partners`, `/suppliers`, `/logistics` | `/partner/*` |
| **Layout** | `Layout` + `AdminSidebar` | `PartnerLayout` + `PartnerSidebar` |
| **Auth Store** | `useAuthStore` | `usePartnerAuthStore` |
| **Token Key** | `auth_token` | `partner_auth_token` |
| **API Client** | `apiClient` | `partnerApiClient` |
| **Backend Middleware** | `authenticate` | `authenticatePartner` |
| **Login Route** | ❌ Not implemented | ✅ `/partner/login` |
| **Registration** | ❌ Not implemented | ✅ `/partner/register` |
| **Password Reset** | ❌ Not implemented | ✅ `/partner/forgot-password` |
| **Dashboard** | `/partners` (list view) | `/partner/dashboard` (stats view) |

---

## 🚀 Key Implementation Notes

1. **Separate Authentication Systems**: Admin and Partner users use completely separate auth systems with different tokens, stores, and API clients.

2. **Route Isolation**: Routes are clearly separated by prefix (`/partner` vs `/partners`), preventing cross-contamination.

3. **Layout Separation**: Each role has its own layout component with appropriate sidebar navigation.

4. **Backend Separation**: Backend uses different middleware (`authenticate` vs `authenticatePartner`) to validate tokens.

5. **Development Mode**: Admin routes currently allow mock users in development (see `middleware/auth.ts`).

6. **Missing Features**: Admin login/registration not yet implemented - currently relies on development mock user.

---

## 🔐 Security Considerations

1. **Token Isolation**: Admin and Partner tokens are stored separately and cannot access each other's routes.

2. **Route Guards**: Both route systems have `beforeLoad` hooks that check authentication before rendering.

3. **API Protection**: Backend middleware validates tokens and ensures users can only access their respective endpoints.

4. **Token Expiry**: Both systems handle token expiration through JWT verification.

5. **Logout**: Logout clears the appropriate token and redirects to the correct login page (or default route).

---

## 📝 Future Enhancements

1. **Admin Login**: Implement admin login page and authentication flow
2. **Role-Based Permissions**: Add granular permissions within each role system
3. **Multi-Tenant Support**: Enhance tenant switching for admin users
4. **Session Management**: Add session timeout and refresh token support
5. **Audit Logging**: Track user actions for both admin and partner users









