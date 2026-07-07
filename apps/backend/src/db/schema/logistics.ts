import { pgTable, uuid, varchar, decimal, integer, jsonb, boolean, timestamp, date, time, text, pgEnum } from 'drizzle-orm/pg-core';
import { partners } from './partners';
import { purchaseOrders } from './suppliers';

export const logisticsTypeEnum = pgEnum('logistics_type', [
  'transportation', 'warehousing', 'fulfillment', 'last_mile',
  'freight_forwarding', '3pl', '4pl'
]);

export const shipmentStatusEnum = pgEnum('shipment_status', [
  'pending', 'picked_up', 'in_transit', 'out_for_delivery',
  'delivered', 'exception', 'cancelled'
]);

export const logisticsPartners = pgTable('logistics_partners', {
  logisticsId: uuid('logistics_id').primaryKey().defaultRandom(),
  partnerId: uuid('partner_id').references(() => partners.partnerId).notNull().unique(),
  logisticsCode: varchar('logistics_code', { length: 50 }).notNull().unique(),
  logisticsType: logisticsTypeEnum('logistics_type').notNull(),
  serviceCapabilities: jsonb('service_capabilities').default([]),
  fleetSize: integer('fleet_size'),
  fleetTypes: jsonb('fleet_types').default([]),
  warehouseLocations: jsonb('warehouse_locations').default([]),
  coverageRegions: jsonb('coverage_regions').default([]),
  trackingCapabilities: boolean('tracking_capabilities').default(true),
  apiIntegration: boolean('api_integration'),
  trackingApiUrl: varchar('tracking_api_url', { length: 500 }),
  insuranceCoverage: decimal('insurance_coverage', { precision: 12, scale: 2 }),
  insuranceCertificateUrl: varchar('insurance_certificate_url', { length: 500 }),
  logisticsPortalEnabled: boolean('logistics_portal_enabled').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const shipments = pgTable('shipments', {
  shipmentId: uuid('shipment_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  logisticsId: uuid('logistics_id').references(() => logisticsPartners.logisticsId).notNull(),
  shipmentNumber: varchar('shipment_number', { length: 100 }).notNull().unique(),
  poId: uuid('po_id').references(() => purchaseOrders.poId),
  shipmentType: varchar('shipment_type', { length: 50 }).notNull(),
  status: shipmentStatusEnum('status').default('pending'),
  pickupDate: date('pickup_date'),
  pickupTime: time('pickup_time'),
  pickupAddress: jsonb('pickup_address').notNull(),
  deliveryDate: date('delivery_date'),
  deliveryTime: time('delivery_time'),
  deliveryAddress: jsonb('delivery_address').notNull(),
  items: jsonb('items').notNull(),
  totalWeight: decimal('total_weight', { precision: 10, scale: 2 }),
  totalVolume: decimal('total_volume', { precision: 10, scale: 2 }),
  packageCount: integer('package_count'),
  trackingUrl: varchar('tracking_url', { length: 500 }),
  carrierReference: varchar('carrier_reference', { length: 100 }),
  slaDeadline: timestamp('sla_deadline'),
  actualDeliveryDate: timestamp('actual_delivery_date'),
  deliveryProof: jsonb('delivery_proof').default({}),
  createdBy: uuid('created_by'),
  assignedDriver: varchar('assigned_driver', { length: 100 }),
  vehicleNumber: varchar('vehicle_number', { length: 50 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const shipmentTrackingEvents = pgTable('shipment_tracking_events', {
  eventId: uuid('event_id').primaryKey().defaultRandom(),
  shipmentId: uuid('shipment_id').references(() => shipments.shipmentId).notNull(),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  eventTimestamp: timestamp('event_timestamp').defaultNow(),
  location: jsonb('location'),
  status: varchar('status', { length: 20 }),
  description: text('description'),
  updatedBy: uuid('updated_by'),
  createdAt: timestamp('created_at').defaultNow(),
});

