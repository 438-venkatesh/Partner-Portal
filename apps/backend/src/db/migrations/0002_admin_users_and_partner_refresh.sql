CREATE TYPE admin_role AS ENUM ('superadmin', 'admin', 'viewer');

CREATE TABLE IF NOT EXISTS admin_users (
  admin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role admin_role NOT NULL DEFAULT 'admin',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  refresh_token_hash VARCHAR(255),
  refresh_token_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE partner_user_accounts ADD COLUMN IF NOT EXISTS refresh_token_hash VARCHAR(255);
ALTER TABLE partner_user_accounts ADD COLUMN IF NOT EXISTS refresh_token_expires_at TIMESTAMP;
ALTER TABLE partner_user_accounts ADD COLUMN IF NOT EXISTS role VARCHAR(32) DEFAULT 'member';
