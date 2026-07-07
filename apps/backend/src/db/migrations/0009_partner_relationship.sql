ALTER TABLE partners ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';
ALTER TABLE partners ADD COLUMN IF NOT EXISTS account_manager_id UUID;
--> statement-breakpoint
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'tier_changed';

CREATE TABLE IF NOT EXISTS partner_tier_definitions (
  tier_code VARCHAR(50) PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  description TEXT,
  rank INTEGER NOT NULL,
  badge_color VARCHAR(20) DEFAULT 'secondary',
  benefits JSONB DEFAULT '[]',
  min_tenure_days INTEGER,
  min_verified_documents INTEGER,
  min_reward_points INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
--> statement-breakpoint
INSERT INTO partner_tier_definitions (tier_code, label, description, rank, badge_color, benefits, min_tenure_days, min_verified_documents)
VALUES
  ('bronze', 'Bronze', 'Newly activated partners.', 0, 'outline', '["Standard support"]', 0, 0),
  ('silver', 'Silver', 'Established partners with a track record of compliance.', 1, 'secondary', '["Priority support", "Co-marketing eligibility"]', 90, 3),
  ('gold', 'Gold', 'High-performing, long-tenured partners.', 2, 'default', '["Priority support", "Co-marketing eligibility", "Dedicated account manager"]', 180, 3),
  ('platinum', 'Platinum', 'Top-tier strategic partners.', 3, 'success', '["Priority support", "Co-marketing eligibility", "Dedicated account manager", "Early access to new services"]', 365, 3)
ON CONFLICT (tier_code) DO NOTHING;

CREATE TABLE IF NOT EXISTS partner_segments (
  segment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  criteria JSONB NOT NULL DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS partner_business_plans (
  plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  target_metric VARCHAR(100),
  target_value NUMERIC(14, 2),
  current_value NUMERIC(14, 2) DEFAULT 0,
  target_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS partner_business_plans_partner_idx ON partner_business_plans (partner_id);

CREATE TABLE IF NOT EXISTS partner_reward_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMP DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS partner_reward_transactions_partner_idx ON partner_reward_transactions (partner_id);

CREATE INDEX IF NOT EXISTS partner_tenant_service_relationships_tenant_idx
  ON partner_tenant_service_relationships (tenant_id);
