CREATE TYPE tenant_status AS ENUM ('active', 'inactive', 'suspended');

CREATE TABLE IF NOT EXISTS tenants (
  tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_code VARCHAR(50) NOT NULL UNIQUE,
  tenant_name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  status tenant_status NOT NULL DEFAULT 'active',
  contact_email VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
