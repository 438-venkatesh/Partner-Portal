CREATE TABLE IF NOT EXISTS platform_audit_logs (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL,
  actor_email VARCHAR(255),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS platform_audit_logs_entity_idx ON platform_audit_logs (entity_type, entity_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS platform_audit_logs_actor_idx ON platform_audit_logs (actor_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS custom_field_definitions (
  field_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL DEFAULT 'partner',
  field_key VARCHAR(100) NOT NULL,
  label VARCHAR(200) NOT NULL,
  field_type VARCHAR(20) NOT NULL DEFAULT 'text',
  options JSONB DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS custom_field_definitions_entity_key_idx ON custom_field_definitions (entity_type, field_key);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS partner_auto_suspend_rules (
  rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  inactivity_days INTEGER NOT NULL DEFAULT 90,
  auto_suspend BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
