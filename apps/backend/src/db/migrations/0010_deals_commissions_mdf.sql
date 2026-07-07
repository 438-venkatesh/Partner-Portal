CREATE TABLE IF NOT EXISTS deals (
  deal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL,
  tenant_id UUID,
  customer_name VARCHAR(255) NOT NULL,
  deal_name VARCHAR(255) NOT NULL,
  estimated_value NUMERIC(14, 2),
  actual_value NUMERIC(14, 2),
  currency VARCHAR(3) DEFAULT 'USD',
  expected_close_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending_review',
  protection_expires_at TIMESTAMP,
  notes TEXT,
  submitted_by UUID,
  registered_on_behalf_by UUID,
  reviewed_by UUID,
  reviewed_at TIMESTAMP,
  resolved_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS deals_partner_idx ON deals (partner_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS deals_tenant_idx ON deals (tenant_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS deals_status_idx ON deals (status);

CREATE TABLE IF NOT EXISTS leads (
  lead_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(50) DEFAULT 'manual',
  customer_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  tenant_id UUID,
  assigned_partner_id UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'new',
  routing_rule_id UUID,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  assigned_at TIMESTAMP,
  responded_at TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS leads_assigned_partner_idx ON leads (assigned_partner_id);

CREATE TABLE IF NOT EXISTS lead_routing_rules (
  rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  partner_type VARCHAR(50),
  min_tier VARCHAR(50),
  tags JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  last_assigned_partner_id UUID,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS commission_plans (
  plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  partner_type VARCHAR(50),
  min_tier VARCHAR(50),
  rate_type VARCHAR(20) NOT NULL DEFAULT 'percentage',
  rate NUMERIC(8, 3),
  tiered_rates JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS commission_records (
  record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL,
  deal_id UUID,
  plan_id UUID,
  challenge_id UUID,
  type VARCHAR(20) NOT NULL DEFAULT 'deal_commission',
  amount NUMERIC(14, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now(),
  approved_by UUID,
  approved_at TIMESTAMP,
  paid_at TIMESTAMP,
  paid_reference VARCHAR(200)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS commission_records_partner_idx ON commission_records (partner_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS commission_records_status_idx ON commission_records (status);

CREATE TABLE IF NOT EXISTS incentive_challenges (
  challenge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  metric VARCHAR(20) NOT NULL,
  target NUMERIC(14, 2) NOT NULL,
  reward_type VARCHAR(20) NOT NULL,
  reward_value NUMERIC(14, 2) NOT NULL,
  partner_type VARCHAR(50),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS challenge_completions (
  completion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL,
  partner_id UUID NOT NULL,
  completed_at TIMESTAMP DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS challenge_completions_unique_idx ON challenge_completions (challenge_id, partner_id);

CREATE TABLE IF NOT EXISTS mdf_funds (
  fund_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  total_budget NUMERIC(14, 2) NOT NULL,
  remaining_budget NUMERIC(14, 2) NOT NULL,
  fiscal_period VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mdf_requests (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL,
  fund_id UUID NOT NULL,
  deal_id UUID,
  campaign_name VARCHAR(255) NOT NULL,
  description TEXT,
  requested_amount NUMERIC(14, 2) NOT NULL,
  approved_amount NUMERIC(14, 2),
  status VARCHAR(20) NOT NULL DEFAULT 'submitted',
  proof_of_expense_url VARCHAR(500),
  rejection_reason TEXT,
  approved_by UUID,
  approved_at TIMESTAMP,
  claimed_at TIMESTAMP,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS mdf_requests_partner_idx ON mdf_requests (partner_id);
