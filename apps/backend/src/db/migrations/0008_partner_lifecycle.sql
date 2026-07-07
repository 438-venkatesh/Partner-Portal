ALTER TABLE partners ADD COLUMN IF NOT EXISTS is_directory_listed BOOLEAN DEFAULT true;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS pii_purged_at TIMESTAMP;
--> statement-breakpoint
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'partner_offboarded';

CREATE TABLE IF NOT EXISTS onboarding_stage_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_type VARCHAR(50) NOT NULL,
  stage_code VARCHAR(50) NOT NULL,
  label VARCHAR(200),
  description TEXT,
  is_enabled BOOLEAN,
  sort_order INTEGER,
  updated_by UUID,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS onboarding_stage_settings_type_stage_idx
  ON onboarding_stage_settings (partner_type, stage_code);

CREATE TABLE IF NOT EXISTS partner_auto_approval_rules (
  rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  partner_type VARCHAR(50),
  min_tier VARCHAR(50),
  require_documents_verified BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS onboarding_reminder_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL,
  stage VARCHAR(50) NOT NULL,
  reminder_step VARCHAR(20) NOT NULL,
  sent_at TIMESTAMP DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS onboarding_reminder_log_dedupe_idx
  ON onboarding_reminder_log (partner_id, stage, reminder_step);

CREATE INDEX IF NOT EXISTS partner_onboarding_workflows_updated_at_idx
  ON partner_onboarding_workflows (updated_at);
