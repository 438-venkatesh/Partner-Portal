CREATE TYPE "public"."partner_status" AS ENUM('pending', 'active', 'suspended', 'terminated', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."partner_type" AS ENUM('agency', 'reseller', 'integrator', 'consultant', 'affiliate', 'supplier', 'logistics_partner', 'supplier_logistics');--> statement-breakpoint
CREATE TYPE "public"."po_status" AS ENUM('draft', 'sent', 'acknowledged', 'confirmed', 'partial', 'completed', 'cancelled', 'closed');--> statement-breakpoint
CREATE TYPE "public"."supplier_category" AS ENUM('raw_materials', 'components', 'finished_goods', 'mro', 'services', 'other');--> statement-breakpoint
CREATE TYPE "public"."logistics_type" AS ENUM('transportation', 'warehousing', 'fulfillment', 'last_mile', 'freight_forwarding', '3pl', '4pl');--> statement-breakpoint
CREATE TYPE "public"."shipment_status" AS ENUM('pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'exception', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."service_status" AS ENUM('pending', 'active', 'suspended', 'terminated', 'expired');--> statement-breakpoint
CREATE TYPE "public"."activity_type" AS ENUM('partner_created', 'partner_updated', 'partner_approved', 'partner_suspended', 'service_added', 'service_removed', 'document_uploaded', 'document_verified', 'agreement_signed', 'permission_changed', 'user_assigned', 'user_removed', 'status_changed', 'onboarding_stage_completed', 'other');--> statement-breakpoint
CREATE TYPE "public"."agreement_status" AS ENUM('draft', 'pending_signature', 'signed', 'expired', 'terminated', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."calendar_event_type" AS ENUM('meeting', 'deadline', 'milestone', 'review', 'training', 'onboarding', 'renewal', 'other');--> statement-breakpoint
CREATE TYPE "public"."context_type" AS ENUM('partner', 'tenant');--> statement-breakpoint
CREATE TYPE "public"."logistics_onboarding_stage" AS ENUM('logistics_registration', 'fleet_setup', 'logistics_documentation', 'logistics_verification', 'logistics_agreement', 'api_integration', 'logistics_portal_access', 'logistics_testing', 'logistics_activation');--> statement-breakpoint
CREATE TYPE "public"."onboarding_stage" AS ENUM('registration', 'service_selection', 'initial_review', 'documentation', 'verification', 'agreement', 'app_access', 'user_setup', 'training', 'testing', 'go_live');--> statement-breakpoint
CREATE TYPE "public"."onboarding_status" AS ENUM('pending', 'in_progress', 'completed', 'blocked', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."supplier_onboarding_stage" AS ENUM('supplier_registration', 'catalog_setup', 'supplier_documentation', 'supplier_verification', 'supplier_agreement', 'payment_setup', 'supplier_portal_access', 'supplier_activation');--> statement-breakpoint
CREATE TYPE "public"."product_category" AS ENUM('raw_materials', 'components', 'finished_goods', 'mro', 'services', 'other');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('active', 'inactive', 'discontinued', 'pending_approval');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'sent', 'pending', 'partial', 'paid', 'overdue', 'cancelled', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'partial', 'paid', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."partner_user_account_status" AS ENUM('pending_verification', 'active', 'suspended', 'inactive', 'deleted');--> statement-breakpoint
CREATE TABLE "partner_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(50) NOT NULL,
	"is_primary_contact" boolean DEFAULT false,
	"is_billing_contact" boolean DEFAULT false,
	"is_technical_contact" boolean DEFAULT false,
	"status" varchar(20) DEFAULT 'active',
	"invited_by" uuid,
	"invited_at" timestamp,
	"joined_at" timestamp,
	"last_active_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"partner_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"partner_code" varchar(50) NOT NULL,
	"partner_name" varchar(255) NOT NULL,
	"display_name" varchar(255),
	"partner_type" "partner_type" NOT NULL,
	"business_type" varchar(50),
	"status" "partner_status" DEFAULT 'pending',
	"tier" varchar(50),
	"registration_date" timestamp DEFAULT now(),
	"approval_date" timestamp,
	"approved_by" uuid,
	"logo_url" varchar(500),
	"website" varchar(255),
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "partners_partner_code_unique" UNIQUE("partner_code")
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"po_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"po_number" varchar(100) NOT NULL,
	"requisition_id" uuid,
	"status" "po_status" DEFAULT 'draft',
	"po_date" date DEFAULT now(),
	"delivery_date" date,
	"delivery_address" jsonb NOT NULL,
	"billing_address" jsonb,
	"items" jsonb NOT NULL,
	"subtotal" numeric(12, 2),
	"tax_amount" numeric(12, 2) DEFAULT '0',
	"shipping_amount" numeric(12, 2) DEFAULT '0',
	"discount_amount" numeric(12, 2) DEFAULT '0',
	"total_amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD',
	"payment_terms" varchar(50),
	"incoterms" varchar(20),
	"created_by" uuid,
	"approved_by" uuid,
	"approved_at" timestamp,
	"acknowledged_by" uuid,
	"acknowledged_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "purchase_orders_po_number_unique" UNIQUE("po_number")
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"supplier_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"supplier_code" varchar(50) NOT NULL,
	"supplier_category" "supplier_category" NOT NULL,
	"supplier_tier" varchar(20),
	"certification_status" jsonb DEFAULT '{}'::jsonb,
	"payment_terms" varchar(50),
	"credit_limit" numeric(12, 2),
	"currency" varchar(3) DEFAULT 'USD',
	"lead_time_days" integer,
	"minimum_order_quantity" numeric(10, 2),
	"supply_regions" jsonb DEFAULT '[]'::jsonb,
	"product_catalog_url" varchar(500),
	"supplier_portal_enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "suppliers_partner_id_unique" UNIQUE("partner_id"),
	CONSTRAINT "suppliers_supplier_code_unique" UNIQUE("supplier_code")
);
--> statement-breakpoint
CREATE TABLE "logistics_partners" (
	"logistics_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"logistics_code" varchar(50) NOT NULL,
	"logistics_type" "logistics_type" NOT NULL,
	"service_capabilities" jsonb DEFAULT '[]'::jsonb,
	"fleet_size" integer,
	"fleet_types" jsonb DEFAULT '[]'::jsonb,
	"warehouse_locations" jsonb DEFAULT '[]'::jsonb,
	"coverage_regions" jsonb DEFAULT '[]'::jsonb,
	"tracking_capabilities" boolean DEFAULT true,
	"api_integration" boolean,
	"tracking_api_url" varchar(500),
	"insurance_coverage" numeric(12, 2),
	"insurance_certificate_url" varchar(500),
	"logistics_portal_enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "logistics_partners_partner_id_unique" UNIQUE("partner_id"),
	CONSTRAINT "logistics_partners_logistics_code_unique" UNIQUE("logistics_code")
);
--> statement-breakpoint
CREATE TABLE "shipment_tracking_events" (
	"event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"event_timestamp" timestamp DEFAULT now(),
	"location" jsonb,
	"status" varchar(20),
	"description" text,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"shipment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"logistics_id" uuid NOT NULL,
	"shipment_number" varchar(100) NOT NULL,
	"po_id" uuid,
	"shipment_type" varchar(50) NOT NULL,
	"status" "shipment_status" DEFAULT 'pending',
	"pickup_date" date,
	"pickup_time" time,
	"pickup_address" jsonb NOT NULL,
	"delivery_date" date,
	"delivery_time" time,
	"delivery_address" jsonb NOT NULL,
	"items" jsonb NOT NULL,
	"total_weight" numeric(10, 2),
	"total_volume" numeric(10, 2),
	"package_count" integer,
	"tracking_url" varchar(500),
	"carrier_reference" varchar(100),
	"sla_deadline" timestamp,
	"actual_delivery_date" timestamp,
	"delivery_proof" jsonb DEFAULT '{}'::jsonb,
	"created_by" uuid,
	"assigned_driver" varchar(100),
	"vehicle_number" varchar(50),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "shipments_shipment_number_unique" UNIQUE("shipment_number")
);
--> statement-breakpoint
CREATE TABLE "partner_service_offerings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'active',
	"certification_level" varchar(50),
	"years_experience" integer,
	"specializations" jsonb DEFAULT '[]'::jsonb,
	"pricing_model" varchar(50),
	"rate" numeric(10, 2),
	"currency" varchar(3) DEFAULT 'USD',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "partner_services" (
	"service_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_code" varchar(50) NOT NULL,
	"service_name" varchar(100) NOT NULL,
	"service_category" varchar(50) NOT NULL,
	"description" text,
	"required_documents" jsonb DEFAULT '[]'::jsonb,
	"applications" jsonb DEFAULT '[]'::jsonb,
	"default_permissions" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "partner_services_service_code_unique" UNIQUE("service_code")
);
--> statement-breakpoint
CREATE TABLE "partner_tenant_service_relationships" (
	"relationship_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"status" "service_status" DEFAULT 'pending',
	"requested_by" varchar(20) NOT NULL,
	"requested_by_user" uuid NOT NULL,
	"requested_services" jsonb NOT NULL,
	"approved_services" jsonb DEFAULT '[]'::jsonb,
	"applications" jsonb DEFAULT '[]'::jsonb,
	"modules" jsonb DEFAULT '{}'::jsonb,
	"permissions" jsonb DEFAULT '{}'::jsonb,
	"custom_permissions" jsonb DEFAULT '{}'::jsonb,
	"start_date" date,
	"end_date" date,
	"grace_period_days" integer,
	"termination_date" date,
	"termination_reason" text,
	"termination_initiated_by" uuid,
	"approval_status" jsonb DEFAULT '{}'::jsonb,
	"approved_by_tenant_admin" uuid,
	"approved_by_partner_admin" uuid,
	"approved_by_platform_admin" uuid,
	"tenant_approved_at" timestamp,
	"partner_approved_at" timestamp,
	"platform_approved_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "partner_documents" (
	"document_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"document_type" varchar(50) NOT NULL,
	"document_name" varchar(255) NOT NULL,
	"file_url" varchar(500) NOT NULL,
	"file_size" integer,
	"mime_type" varchar(100),
	"version" varchar(20) DEFAULT '1.0',
	"expiry_date" date,
	"status" varchar(20) DEFAULT 'pending',
	"verified_by" uuid,
	"verified_at" timestamp,
	"uploaded_by" uuid,
	"uploaded_at" timestamp DEFAULT now(),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "context_switching" (
	"switch_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"partner_id" uuid,
	"tenant_id" uuid,
	"current_context" "context_type" NOT NULL,
	"previous_context" "context_type",
	"switched_at" timestamp DEFAULT now(),
	"ip_address" varchar(45),
	"user_agent" text,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "logistics_onboarding_workflows" (
	"workflow_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"logistics_id" uuid NOT NULL,
	"current_stage" "logistics_onboarding_stage" DEFAULT 'logistics_registration',
	"stage_status" "onboarding_status" DEFAULT 'pending',
	"completed_stages" jsonb DEFAULT '[]'::jsonb,
	"stage_data" jsonb DEFAULT '{}'::jsonb,
	"blocked_reasons" text,
	"assigned_to" uuid,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "logistics_onboarding_workflows_logistics_id_unique" UNIQUE("logistics_id")
);
--> statement-breakpoint
CREATE TABLE "partner_activity_logs" (
	"log_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"tenant_id" uuid,
	"activity_type" "activity_type" NOT NULL,
	"activity_description" text NOT NULL,
	"performed_by" uuid NOT NULL,
	"performed_by_type" varchar(20) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "partner_agreements" (
	"agreement_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"tenant_id" uuid,
	"relationship_id" uuid,
	"agreement_type" varchar(50) NOT NULL,
	"agreement_number" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"document_url" varchar(500),
	"status" "agreement_status" DEFAULT 'draft',
	"start_date" date,
	"end_date" date,
	"auto_renew" boolean DEFAULT false,
	"renewal_period_days" integer,
	"terms" jsonb DEFAULT '{}'::jsonb,
	"signed_by_partner" uuid,
	"signed_by_tenant" uuid,
	"signed_by_platform" uuid,
	"partner_signed_at" timestamp,
	"tenant_signed_at" timestamp,
	"platform_signed_at" timestamp,
	"e_signature_provider" varchar(50),
	"e_signature_document_id" varchar(255),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "partner_agreements_agreement_number_unique" UNIQUE("agreement_number")
);
--> statement-breakpoint
CREATE TABLE "partner_calendar_events" (
	"event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"tenant_id" uuid,
	"relationship_id" uuid,
	"event_type" "calendar_event_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"all_day" boolean DEFAULT false,
	"location" varchar(255),
	"attendees" jsonb DEFAULT '[]'::jsonb,
	"reminder_minutes" integer,
	"reminder_sent" boolean DEFAULT false,
	"reminder_sent_at" timestamp,
	"status" varchar(20) DEFAULT 'scheduled',
	"created_by" uuid NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "partner_onboarding_workflows" (
	"workflow_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"current_stage" "onboarding_stage" DEFAULT 'registration',
	"stage_status" "onboarding_status" DEFAULT 'pending',
	"completed_stages" jsonb DEFAULT '[]'::jsonb,
	"stage_data" jsonb DEFAULT '{}'::jsonb,
	"blocked_reasons" text,
	"assigned_to" uuid,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "partner_onboarding_workflows_partner_id_unique" UNIQUE("partner_id")
);
--> statement-breakpoint
CREATE TABLE "permission_change_audit_logs" (
	"audit_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"relationship_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"change_type" varchar(20) NOT NULL,
	"permission_type" varchar(50) NOT NULL,
	"permission_key" varchar(100) NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"reason" text,
	"changed_by" uuid NOT NULL,
	"changed_by_type" varchar(20) NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp,
	"effective_date" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_performance_tracking" (
	"tracking_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"relationship_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"tracking_period" varchar(20) NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"metrics" jsonb DEFAULT '{}'::jsonb,
	"revenue" jsonb DEFAULT '{}'::jsonb,
	"transactions" integer DEFAULT 0,
	"success_rate" numeric(5, 2),
	"average_response_time" integer,
	"customer_satisfaction" numeric(3, 2),
	"sla_compliance" numeric(5, 2),
	"issues_count" integer DEFAULT 0,
	"resolved_issues_count" integer DEFAULT 0,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "supplier_onboarding_workflows" (
	"workflow_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"current_stage" "supplier_onboarding_stage" DEFAULT 'supplier_registration',
	"stage_status" "onboarding_status" DEFAULT 'pending',
	"completed_stages" jsonb DEFAULT '[]'::jsonb,
	"stage_data" jsonb DEFAULT '{}'::jsonb,
	"blocked_reasons" text,
	"assigned_to" uuid,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "supplier_onboarding_workflows_supplier_id_unique" UNIQUE("supplier_id")
);
--> statement-breakpoint
CREATE TABLE "product_catalog_sharing" (
	"sharing_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product_id" uuid,
	"shared_at" timestamp DEFAULT now(),
	"shared_by" uuid NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "supplier_products" (
	"product_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"product_code" varchar(100) NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"product_category" "product_category" NOT NULL,
	"description" text,
	"specifications" jsonb DEFAULT '{}'::jsonb,
	"unit_of_measure" varchar(20) DEFAULT 'piece',
	"unit_price" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD',
	"minimum_order_quantity" numeric(10, 2) DEFAULT '1',
	"lead_time_days" integer,
	"status" "product_status" DEFAULT 'pending_approval',
	"image_url" varchar(500),
	"image_urls" jsonb DEFAULT '[]'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "invoice_payments" (
	"payment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"payment_amount" numeric(12, 2) NOT NULL,
	"payment_date" date DEFAULT now(),
	"payment_method" varchar(50),
	"payment_reference" varchar(100),
	"transaction_id" varchar(255),
	"status" "payment_status" DEFAULT 'pending',
	"notes" text,
	"processed_by" uuid,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "supplier_invoices" (
	"invoice_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"invoice_number" varchar(100) NOT NULL,
	"po_id" uuid,
	"invoice_date" date DEFAULT now(),
	"due_date" date NOT NULL,
	"status" "invoice_status" DEFAULT 'draft',
	"payment_status" "payment_status" DEFAULT 'pending',
	"items" jsonb NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT '0',
	"discount_amount" numeric(12, 2) DEFAULT '0',
	"total_amount" numeric(12, 2) NOT NULL,
	"paid_amount" numeric(12, 2) DEFAULT '0',
	"currency" varchar(3) DEFAULT 'USD',
	"payment_terms" varchar(50),
	"billing_address" jsonb,
	"notes" text,
	"sent_at" timestamp,
	"paid_at" timestamp,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "supplier_invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "partner_user_accounts" (
	"account_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"phone" varchar(20),
	"status" "partner_user_account_status" DEFAULT 'pending_verification',
	"email_verified" boolean DEFAULT false,
	"email_verification_token" varchar(100),
	"email_verification_expires" timestamp,
	"password_reset_token" varchar(100),
	"password_reset_expires" timestamp,
	"last_login_at" timestamp,
	"last_login_ip" varchar(45),
	"failed_login_attempts" varchar(10) DEFAULT '0',
	"locked_until" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "partner_user_accounts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "service_timelines" (
	"timeline_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"relationship_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"service_type" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"due_date" timestamp NOT NULL,
	"completed_date" timestamp,
	"status" varchar(20) DEFAULT 'pending',
	"priority" varchar(20) DEFAULT 'medium',
	"recurrence_type" varchar(50),
	"recurrence_interval" varchar(10),
	"next_due_date" timestamp,
	"assigned_to" uuid,
	"notes" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "partner_users" ADD CONSTRAINT "partner_users_partner_id_partners_partner_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("partner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_supplier_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("supplier_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_partner_id_partners_partner_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("partner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logistics_partners" ADD CONSTRAINT "logistics_partners_partner_id_partners_partner_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("partner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_tracking_events" ADD CONSTRAINT "shipment_tracking_events_shipment_id_shipments_shipment_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("shipment_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_logistics_id_logistics_partners_logistics_id_fk" FOREIGN KEY ("logistics_id") REFERENCES "public"."logistics_partners"("logistics_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_po_id_purchase_orders_po_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("po_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_service_offerings" ADD CONSTRAINT "partner_service_offerings_partner_id_partners_partner_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("partner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_service_offerings" ADD CONSTRAINT "partner_service_offerings_service_id_partner_services_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."partner_services"("service_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_tenant_service_relationships" ADD CONSTRAINT "partner_tenant_service_relationships_partner_id_partners_partner_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("partner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_tenant_service_relationships" ADD CONSTRAINT "partner_tenant_service_relationships_service_id_partner_services_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."partner_services"("service_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_documents" ADD CONSTRAINT "partner_documents_partner_id_partners_partner_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("partner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "context_switching" ADD CONSTRAINT "context_switching_partner_id_partners_partner_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("partner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_activity_logs" ADD CONSTRAINT "partner_activity_logs_partner_id_partners_partner_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("partner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_agreements" ADD CONSTRAINT "partner_agreements_partner_id_partners_partner_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("partner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_agreements" ADD CONSTRAINT "partner_agreements_relationship_id_partner_tenant_service_relationships_relationship_id_fk" FOREIGN KEY ("relationship_id") REFERENCES "public"."partner_tenant_service_relationships"("relationship_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_calendar_events" ADD CONSTRAINT "partner_calendar_events_partner_id_partners_partner_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("partner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_calendar_events" ADD CONSTRAINT "partner_calendar_events_relationship_id_partner_tenant_service_relationships_relationship_id_fk" FOREIGN KEY ("relationship_id") REFERENCES "public"."partner_tenant_service_relationships"("relationship_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_onboarding_workflows" ADD CONSTRAINT "partner_onboarding_workflows_partner_id_partners_partner_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("partner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_change_audit_logs" ADD CONSTRAINT "permission_change_audit_logs_relationship_id_partner_tenant_service_relationships_relationship_id_fk" FOREIGN KEY ("relationship_id") REFERENCES "public"."partner_tenant_service_relationships"("relationship_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_change_audit_logs" ADD CONSTRAINT "permission_change_audit_logs_partner_id_partners_partner_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("partner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_performance_tracking" ADD CONSTRAINT "service_performance_tracking_relationship_id_partner_tenant_service_relationships_relationship_id_fk" FOREIGN KEY ("relationship_id") REFERENCES "public"."partner_tenant_service_relationships"("relationship_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_performance_tracking" ADD CONSTRAINT "service_performance_tracking_partner_id_partners_partner_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("partner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_performance_tracking" ADD CONSTRAINT "service_performance_tracking_service_id_partner_services_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."partner_services"("service_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_catalog_sharing" ADD CONSTRAINT "product_catalog_sharing_supplier_id_suppliers_supplier_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("supplier_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_catalog_sharing" ADD CONSTRAINT "product_catalog_sharing_product_id_supplier_products_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."supplier_products"("product_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_supplier_id_suppliers_supplier_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("supplier_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_invoice_id_supplier_invoices_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."supplier_invoices"("invoice_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_supplier_id_suppliers_supplier_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("supplier_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_po_id_purchase_orders_po_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("po_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_user_accounts" ADD CONSTRAINT "partner_user_accounts_partner_id_partners_partner_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("partner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_timelines" ADD CONSTRAINT "service_timelines_partner_id_partners_partner_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("partner_id") ON DELETE no action ON UPDATE no action;