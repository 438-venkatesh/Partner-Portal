CREATE TABLE IF NOT EXISTS co_marketing_pages (
  page_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL,
  asset_id UUID,
  slug VARCHAR(80) NOT NULL UNIQUE,
  headline VARCHAR(200) NOT NULL,
  description TEXT,
  cta_label VARCHAR(100) DEFAULT 'Request a consultation',
  is_active BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  lead_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS co_marketing_pages_partner_idx ON co_marketing_pages (partner_id);

CREATE TABLE IF NOT EXISTS referral_links (
  link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL,
  code VARCHAR(30) NOT NULL UNIQUE,
  campaign_name VARCHAR(200) NOT NULL,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  page_id UUID,
  target_url VARCHAR(500),
  click_count INTEGER DEFAULT 0,
  lead_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS referral_links_partner_idx ON referral_links (partner_id);
--> statement-breakpoint
ALTER TABLE marketing_assets ADD COLUMN IF NOT EXISTS allow_co_branding BOOLEAN DEFAULT false;
--> statement-breakpoint
ALTER TABLE leads ADD COLUMN IF NOT EXISTS referral_link_id UUID;
--> statement-breakpoint
ALTER TABLE leads ADD COLUMN IF NOT EXISTS co_marketing_page_id UUID;
