ALTER TABLE partner_agreements ADD COLUMN IF NOT EXISTS partner_signature_name VARCHAR(255);
ALTER TABLE partner_agreements ADD COLUMN IF NOT EXISTS partner_signature_ip VARCHAR(45);
ALTER TABLE partner_agreements ADD COLUMN IF NOT EXISTS partner_signature_user_agent VARCHAR(500);
--> statement-breakpoint
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'document_deleted';
--> statement-breakpoint
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'login';

CREATE TABLE IF NOT EXISTS agreement_reminder_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL,
  reminder_step VARCHAR(20) NOT NULL,
  sent_at TIMESTAMP DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS agreement_reminder_log_agreement_idx ON agreement_reminder_log (agreement_id);

CREATE TABLE IF NOT EXISTS data_erasure_requests (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL,
  requested_by UUID,
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS data_erasure_requests_partner_idx ON data_erasure_requests (partner_id);
