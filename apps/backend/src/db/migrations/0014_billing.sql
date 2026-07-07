ALTER TABLE partner_billing_plans ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS partner_billing_invoices (
  invoice_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL,
  subscription_id UUID NOT NULL,
  plan_name VARCHAR(255) NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
  paid_at TIMESTAMP,
  paid_reference VARCHAR(255),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS partner_billing_invoices_partner_idx ON partner_billing_invoices (partner_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS partner_billing_invoices_subscription_idx ON partner_billing_invoices (subscription_id);
