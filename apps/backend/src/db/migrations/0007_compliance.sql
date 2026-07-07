ALTER TABLE partners ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS data_retention_days INTEGER DEFAULT 365;

ALTER TABLE partner_user_accounts ADD COLUMN IF NOT EXISTS accepted_terms_at TIMESTAMP;
ALTER TABLE partner_user_accounts ADD COLUMN IF NOT EXISTS accepted_terms_version VARCHAR(32);
