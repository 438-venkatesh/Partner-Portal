-- Partner Management Portal - Initial Migration
-- Generated for PostgreSQL

-- Create enums
CREATE TYPE partner_type AS ENUM (
  'agency', 'reseller', 'integrator', 'consultant', 'affiliate',
  'supplier', 'logistics_partner', 'supplier_logistics'
);

CREATE TYPE partner_status AS ENUM (
  'pending', 'active', 'suspended', 'terminated', 'inactive'
);

CREATE TYPE service_status AS ENUM (
  'pending', 'active', 'suspended', 'terminated', 'expired'
);

CREATE TYPE po_status AS ENUM (
  'draft', 'sent', 'acknowledged', 'confirmed', 'partial', 
  'completed', 'cancelled', 'closed'
);

CREATE TYPE shipment_status AS ENUM (
  'pending', 'picked_up', 'in_transit', 'out_for_delivery',
  'delivered', 'exception', 'cancelled'
);

CREATE TYPE supplier_category AS ENUM (
  'raw_materials', 'components', 'finished_goods', 'mro', 'services', 'other'
);

CREATE TYPE logistics_type AS ENUM (
  'transportation', 'warehousing', 'fulfillment', 'last_mile',
  'freight_forwarding', '3pl', '4pl'
);

-- Create partners table
CREATE TABLE partners (
  partner_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  partner_code VARCHAR(50) NOT NULL UNIQUE,
  partner_name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  partner_type partner_type NOT NULL,
  business_type VARCHAR(50),
  status partner_status DEFAULT 'pending',
  tier VARCHAR(50),
  registration_date TIMESTAMP DEFAULT NOW(),
  approval_date TIMESTAMP,
  approved_by UUID,
  logo_url VARCHAR(500),
  website VARCHAR(255),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create suppliers table
CREATE TABLE suppliers (
  supplier_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL UNIQUE REFERENCES partners(partner_id),
  supplier_code VARCHAR(50) NOT NULL UNIQUE,
  supplier_category supplier_category NOT NULL,
  supplier_tier VARCHAR(20),
  certification_status JSONB DEFAULT '{}',
  payment_terms VARCHAR(50),
  credit_limit DECIMAL(12,2),
  currency VARCHAR(3) DEFAULT 'USD',
  lead_time_days INTEGER,
  minimum_order_quantity DECIMAL(10,2),
  supply_regions JSONB DEFAULT '[]',
  product_catalog_url VARCHAR(500),
  supplier_portal_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create logistics_partners table
CREATE TABLE logistics_partners (
  logistics_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL UNIQUE REFERENCES partners(partner_id),
  logistics_code VARCHAR(50) NOT NULL UNIQUE,
  logistics_type logistics_type NOT NULL,
  service_capabilities JSONB DEFAULT '[]',
  fleet_size INTEGER,
  fleet_types JSONB DEFAULT '[]',
  warehouse_locations JSONB DEFAULT '[]',
  coverage_regions JSONB DEFAULT '[]',
  tracking_capabilities BOOLEAN DEFAULT true,
  api_integration BOOLEAN,
  tracking_api_url VARCHAR(500),
  insurance_coverage DECIMAL(12,2),
  insurance_certificate_url VARCHAR(500),
  logistics_portal_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create purchase_orders table
CREATE TABLE purchase_orders (
  po_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(supplier_id),
  po_number VARCHAR(100) NOT NULL UNIQUE,
  requisition_id UUID,
  status po_status DEFAULT 'draft',
  po_date DATE DEFAULT CURRENT_DATE,
  delivery_date DATE,
  delivery_address JSONB NOT NULL,
  billing_address JSONB,
  items JSONB NOT NULL,
  subtotal DECIMAL(12,2),
  tax_amount DECIMAL(12,2) DEFAULT 0,
  shipping_amount DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_terms VARCHAR(50),
  incoterms VARCHAR(20),
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMP,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create shipments table
CREATE TABLE shipments (
  shipment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  logistics_id UUID NOT NULL REFERENCES logistics_partners(logistics_id),
  shipment_number VARCHAR(100) NOT NULL UNIQUE,
  po_id UUID REFERENCES purchase_orders(po_id),
  shipment_type VARCHAR(50) NOT NULL,
  status shipment_status DEFAULT 'pending',
  pickup_date DATE,
  pickup_time TIME,
  pickup_address JSONB NOT NULL,
  delivery_date DATE,
  delivery_time TIME,
  delivery_address JSONB NOT NULL,
  items JSONB NOT NULL,
  total_weight DECIMAL(10,2),
  total_volume DECIMAL(10,2),
  package_count INTEGER,
  tracking_url VARCHAR(500),
  carrier_reference VARCHAR(100),
  sla_deadline TIMESTAMP,
  actual_delivery_date TIMESTAMP,
  delivery_proof JSONB DEFAULT '{}',
  created_by UUID,
  assigned_driver VARCHAR(100),
  vehicle_number VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_partners_status ON partners(status);
CREATE INDEX idx_partners_type ON partners(partner_type);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_shipments_logistics ON shipments(logistics_id);
CREATE INDEX idx_shipments_status ON shipments(status);

