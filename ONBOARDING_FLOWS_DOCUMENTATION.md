# Partner Portal - Complete Onboarding Flows Documentation

## Overview

This document defines the complete onboarding workflows for three types of partners:
1. **Service Partners** (Agency, Reseller, Integrator, Consultant, Affiliate)
2. **Suppliers** (Raw Materials, Components, Finished Goods, MRO, Services)
3. **Logistics Partners** (Transportation, Warehousing, Fulfillment, Last Mile, Freight Forwarding, 3PL, 4PL)

---

## 1. SERVICE PARTNER ONBOARDING FLOW

Service partner stages are **not one-size-fits-all**. Each `partner_type` has its own ordered path (configured in `packages/common/src/partnerOnboardingByType.ts`). Stages that do not apply are auto-marked `skipped` in the database.

| Partner type | Stage count | Stages (in order) |
|--------------|-------------|-------------------|
| **agency** | 11 | registration → service_selection → initial_review → documentation → verification → agreement → app_access → user_setup → training → testing → go_live |
| **reseller** | 9 | registration → service_selection → initial_review → documentation → verification → agreement → user_setup → training → go_live |
| **consultant** | 9 | Same as **reseller** |
| **integrator** | 10 | registration → service_selection → initial_review → documentation → verification → agreement → app_access → user_setup → testing → go_live |
| **affiliate** | 6 | registration → initial_review → documentation → agreement → user_setup → go_live |

### Flow Overview (agency — full 11-stage reference)
**Total Stages:** 11  
**Estimated Duration:** 15-25 business days  
**Status:** ✅ Implemented

### Stage-by-Stage Breakdown

#### Stage 1: Registration
- **Code:** `registration`
- **Status:** Auto-started when partner is created
- **Actions Required:**
  - Partner fills registration form
  - Accepts terms and conditions
  - Submits basic company information
- **Completion Criteria:** Form submitted successfully
- **Auto-Advance:** Yes (to Service Selection)
- **Estimated Time:** 15 minutes

#### Stage 2: Service Selection
- **Code:** `service_selection`
- **Status:** Starts after Registration
- **Actions Required:**
  - Partner selects services to offer (from 98 available services)
  - Defines service capabilities
  - Sets pricing models
- **Completion Criteria:** At least one service selected
- **Auto-Advance:** No (requires admin review)
- **Estimated Time:** 1-2 hours

#### Stage 3: Initial Review
- **Code:** `initial_review`
- **Status:** Admin action required
- **Actions Required:**
  - Platform admin reviews partner application
  - Verifies company information
  - Checks service selections
  - Approves or requests changes
- **Completion Criteria:** Admin approval
- **Auto-Advance:** Yes (to Documentation)
- **Estimated Time:** 1-2 business days

#### Stage 4: Documentation
- **Code:** `documentation`
- **Status:** Partner action required
- **Actions Required:**
  - Partner uploads required documents:
    - Business license
    - Tax registration
    - Insurance certificates
    - Certifications (if applicable)
  - Completes document checklist
- **Completion Criteria:** All required documents uploaded
- **Auto-Advance:** No (requires verification)
- **Estimated Time:** 2-3 business days

#### Stage 5: Verification
- **Code:** `verification`
- **Status:** Admin action required
- **Actions Required:**
  - Platform admin verifies uploaded documents
  - Performs background checks
  - Validates company information
  - Approves or requests additional documents
- **Completion Criteria:** All documents verified and approved
- **Auto-Advance:** Yes (to Agreement)
- **Estimated Time:** 2-3 business days

#### Stage 6: Agreement
- **Code:** `agreement`
- **Status:** Partner and Admin action required
- **Actions Required:**
  - Platform generates partnership agreement
  - Partner reviews agreement
  - Partner signs agreement (e-signature)
  - Platform admin countersigns
- **Completion Criteria:** Agreement signed by both parties
- **Auto-Advance:** Yes (to App Access)
- **Estimated Time:** 1 business day

#### Stage 7: App Access
- **Code:** `app_access`
- **Status:** Admin action required
- **Actions Required:**
  - Platform admin configures application access
  - Assigns default permissions
  - Sets up API access (if needed)
  - Grants portal access
- **Completion Criteria:** Access configured and granted
- **Auto-Advance:** Yes (to User Setup)
- **Estimated Time:** 1 business day

#### Stage 8: User Setup
- **Code:** `user_setup`
- **Status:** Partner action required
- **Actions Required:**
  - Partner creates user accounts
  - Assigns roles and permissions
  - Sets up primary contacts
  - Configures user access levels
- **Completion Criteria:** At least one admin user created
- **Auto-Advance:** Yes (to Training)
- **Estimated Time:** 1-2 business days

#### Stage 9: Training
- **Code:** `training`
- **Status:** Partner action required
- **Actions Required:**
  - Partner completes training modules
  - Passes training assessments
  - Reviews platform documentation
  - Completes certification (if required)
- **Completion Criteria:** All required training completed
- **Auto-Advance:** No (requires testing)
- **Estimated Time:** 3-5 business days

#### Stage 10: Testing
- **Code:** `testing`
- **Status:** Partner action required
- **Actions Required:**
  - Partner tests system access
  - Verifies functionality
  - Tests service creation workflows
  - Reports any issues
- **Completion Criteria:** All tests passed, no critical issues
- **Auto-Advance:** No (requires final approval)
- **Estimated Time:** 1-2 business days

#### Stage 11: Go Live
- **Code:** `go_live`
- **Status:** Admin action required
- **Actions Required:**
  - Platform admin performs final review
  - Activates partner account
  - Changes partner status to 'active'
  - Sends activation notification
- **Completion Criteria:** Partner activated and live
- **Auto-Advance:** N/A (Final stage)
- **Estimated Time:** 1 business day

### Stage Dependencies

```
Registration → Service Selection → Initial Review → Documentation → Verification → Agreement → App Access → User Setup → Training → Testing → Go Live
```

### Status Transitions

- **pending** → **in_progress**: Stage started
- **in_progress** → **completed**: Stage completed successfully
- **in_progress** → **blocked**: Issue encountered, requires resolution
- **blocked** → **in_progress**: Issue resolved, stage resumed
- **pending** → **skipped**: Stage skipped (admin decision)

---

## 2. SUPPLIER ONBOARDING FLOW

### Flow Overview
**Total Stages:** 8  
**Estimated Duration:** 10-18 business days  
**Status:** Implemented (partner portal CRUD + admin approve/reject workflow)

### Stage-by-Stage Breakdown

#### Stage 1: Supplier Registration
- **Code:** `supplier_registration`
- **Status:** Auto-started when supplier partner is created
- **Actions Required:**
  - Supplier fills registration form
  - Provides company information
  - Selects supplier category
  - Accepts supplier terms
- **Completion Criteria:** Registration form submitted
- **Auto-Advance:** Yes (to Catalog Setup)
- **Estimated Time:** 30 minutes

#### Stage 2: Catalog Setup
- **Code:** `catalog_setup`
- **Status:** Supplier action required
- **Actions Required:**
  - Supplier creates product catalog
  - Adds product categories
  - Enters product details (SKU, name, description, pricing)
  - Uploads product images
  - Sets lead times and MOQ
- **Completion Criteria:** At least 5 products added to catalog
- **Auto-Advance:** No (requires review)
- **Estimated Time:** 2-3 business days

#### Stage 3: Document Upload
- **Code:** `supplier_documentation`
- **Status:** Supplier action required
- **Actions Required:**
  - Upload business license
  - Upload tax certificates
  - Upload quality certifications
  - Upload insurance certificates
  - Upload compliance documents
- **Completion Criteria:** All required documents uploaded
- **Auto-Advance:** No (requires verification)
- **Estimated Time:** 1-2 business days

#### Stage 4: Verification & Review
- **Code:** `supplier_verification`
- **Status:** Admin action required
- **Actions Required:**
  - Platform admin verifies documents
  - Reviews product catalog
  - Validates supplier credentials
  - Checks compliance requirements
- **Completion Criteria:** Documents verified, catalog approved
- **Auto-Advance:** Yes (to Agreement)
- **Estimated Time:** 2-3 business days

#### Stage 5: Supplier Agreement
- **Code:** `supplier_agreement`
- **Status:** Supplier and Admin action required
- **Actions Required:**
  - Platform generates supplier agreement
  - Supplier reviews terms
  - Supplier signs agreement
  - Platform admin countersigns
- **Completion Criteria:** Agreement signed by both parties
- **Auto-Advance:** Yes (to Payment Setup)
- **Estimated Time:** 1 business day

#### Stage 6: Payment & Terms Setup
- **Code:** `payment_setup`
- **Status:** Admin action required
- **Actions Required:**
  - Configure payment terms
  - Set credit limits
  - Setup payment methods
  - Configure invoicing rules
- **Completion Criteria:** Payment terms configured
- **Auto-Advance:** Yes (to Portal Access)
- **Estimated Time:** 1 business day

#### Stage 7: Portal Access & Training
- **Code:** `supplier_portal_access`
- **Status:** Supplier action required
- **Actions Required:**
  - Supplier receives portal access
  - Completes supplier portal training
  - Tests PO acknowledgment workflow
  - Tests invoice creation
- **Completion Criteria:** Training completed, portal tested
- **Auto-Advance:** No (requires testing)
- **Estimated Time:** 2-3 business days

#### Stage 8: Supplier Activation
- **Code:** `supplier_activation`
- **Status:** Admin action required
- **Actions Required:**
  - Platform admin performs final review
  - Activates supplier account
  - Enables catalog sharing
  - Sends activation notification
- **Completion Criteria:** Supplier activated and live
- **Auto-Advance:** N/A (Final stage)
- **Estimated Time:** 1 business day

### Stage Dependencies

```
Supplier Registration → Catalog Setup → Document Upload → Verification & Review → Supplier Agreement → Payment & Terms Setup → Portal Access & Training → Supplier Activation
```

---

## 3. LOGISTICS PARTNER ONBOARDING FLOW

### Flow Overview
**Total Stages:** 9  
**Estimated Duration:** 12-20 business days  
**Status:** 🟡 Needs Implementation

### Stage-by-Stage Breakdown

#### Stage 1: Logistics Registration
- **Code:** `logistics_registration`
- **Status:** Auto-started when logistics partner is created
- **Actions Required:**
  - Logistics partner fills registration form
  - Provides company information
  - Selects logistics type
  - Defines service capabilities
- **Completion Criteria:** Registration form submitted
- **Auto-Advance:** Yes (to Fleet Setup)
- **Estimated Time:** 30 minutes

#### Stage 2: Fleet & Infrastructure Setup
- **Code:** `fleet_setup`
- **Status:** Logistics partner action required
- **Actions Required:**
  - Register fleet vehicles
  - Add vehicle details (type, capacity, registration)
  - Register warehouse locations (if applicable)
  - Define coverage regions
  - Setup tracking capabilities
- **Completion Criteria:** At least one vehicle registered, coverage regions defined
- **Auto-Advance:** No (requires review)
- **Estimated Time:** 2-3 business days

#### Stage 3: Document Upload
- **Code:** `logistics_documentation`
- **Status:** Logistics partner action required
- **Actions Required:**
  - Upload transportation license
  - Upload vehicle registrations
  - Upload driver licenses
  - Upload warehouse licenses (if applicable)
  - Upload insurance certificates
  - Upload compliance certificates
- **Completion Criteria:** All required documents uploaded
- **Auto-Advance:** No (requires verification)
- **Estimated Time:** 2-3 business days

#### Stage 4: Verification & Review
- **Code:** `logistics_verification`
- **Status:** Admin action required
- **Actions Required:**
  - Platform admin verifies documents
  - Reviews fleet information
  - Validates licenses and certifications
  - Checks insurance coverage
  - Verifies tracking capabilities
- **Completion Criteria:** Documents verified, fleet approved
- **Auto-Advance:** Yes (to Agreement)
- **Estimated Time:** 2-3 business days

#### Stage 5: Logistics Agreement
- **Code:** `logistics_agreement`
- **Status:** Logistics partner and Admin action required
- **Actions Required:**
  - Platform generates logistics agreement
  - Logistics partner reviews terms
  - Logistics partner signs agreement
  - Platform admin countersigns
- **Completion Criteria:** Agreement signed by both parties
- **Auto-Advance:** Yes (to API Integration)
- **Estimated Time:** 1 business day

#### Stage 6: API Integration (Optional)
- **Code:** `api_integration`
- **Status:** Logistics partner action required (if applicable)
- **Actions Required:**
  - Setup tracking API integration
  - Configure webhooks
  - Test API connectivity
  - Validate tracking data flow
- **Completion Criteria:** API integrated and tested (or skipped)
- **Auto-Advance:** Yes (to Portal Access)
- **Estimated Time:** 2-3 business days (or skipped)

#### Stage 7: Portal Access & Training
- **Code:** `logistics_portal_access`
- **Status:** Logistics partner action required
- **Actions Required:**
  - Logistics partner receives portal access
  - Completes logistics portal training
  - Tests shipment acceptance workflow
  - Tests tracking update workflow
  - Tests delivery proof upload
- **Completion Criteria:** Training completed, portal tested
- **Auto-Advance:** No (requires testing)
- **Estimated Time:** 2-3 business days

#### Stage 8: Testing & Validation
- **Code:** `logistics_testing`
- **Status:** Logistics partner action required
- **Actions Required:**
  - Test shipment acceptance process
  - Test tracking event updates
  - Test delivery proof upload
  - Verify real-time tracking (if applicable)
  - Report any issues
- **Completion Criteria:** All tests passed, no critical issues
- **Auto-Advance:** No (requires final approval)
- **Estimated Time:** 1-2 business days

#### Stage 9: Logistics Activation
- **Code:** `logistics_activation`
- **Status:** Admin action required
- **Actions Required:**
  - Platform admin performs final review
  - Activates logistics partner account
  - Enables shipment assignment
  - Sends activation notification
- **Completion Criteria:** Logistics partner activated and live
- **Auto-Advance:** N/A (Final stage)
- **Estimated Time:** 1 business day

### Stage Dependencies

```
Logistics Registration → Fleet & Infrastructure Setup → Document Upload → Verification & Review → Logistics Agreement → API Integration (Optional) → Portal Access & Training → Testing & Validation → Logistics Activation
```

---

## Implementation Status

### ✅ Completed
- Partner Onboarding Flow (11 stages) - Backend & Frontend
- Database schema for partner onboarding workflows
- Onboarding workflow UI component
- Stage update API

### 🟡 Partial
- Supplier onboarding flow - Schema ready, needs implementation
- Logistics onboarding flow - Schema ready, needs implementation

### ❌ Pending
- Supplier onboarding workflow UI
- Logistics onboarding workflow UI
- Auto-initialization of workflows on partner creation
- Workflow stage dependencies enforcement
- Email notifications for stage transitions
- Workflow progress tracking dashboard

---

## Next Steps

1. Create supplier onboarding workflow tables
2. Create logistics onboarding workflow tables
3. Implement backend services for supplier/logistics onboarding
4. Create frontend components for supplier/logistics onboarding
5. Auto-initialize workflows when partners are created
6. Add workflow stage dependency validation
7. Add email notifications
8. Create workflow progress dashboard









