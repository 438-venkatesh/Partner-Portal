-- Billing, API keys, webhooks (commercial layer)

CREATE TABLE IF NOT EXISTS partner_billing_plans (
  plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name VARCHAR(255) NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  features JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partner_subscriptions (
  subscription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(partner_id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES partner_billing_plans(plan_id),
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  billing_cycle VARCHAR(32) NOT NULL DEFAULT 'monthly',
  next_billing_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partner_api_keys (
  key_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(partner_id) ON DELETE CASCADE,
  key_hash VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(16) NOT NULL,
  scopes JSONB DEFAULT '[]',
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partner_webhooks (
  webhook_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(partner_id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events JSONB NOT NULL DEFAULT '[]',
  secret VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO partner_billing_plans (plan_name, price_cents)
SELECT 'Starter', 0
WHERE NOT EXISTS (SELECT 1 FROM partner_billing_plans LIMIT 1);

INSERT INTO partner_billing_plans (plan_name, price_cents)
SELECT 'Growth', 9900
WHERE NOT EXISTS (SELECT 1 FROM partner_billing_plans WHERE plan_name = 'Growth');
