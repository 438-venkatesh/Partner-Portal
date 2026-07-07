import { z } from 'zod';

export const logisticsTypeSchema = z.enum([
  'transportation',
  'warehousing',
  'fulfillment',
  'last_mile',
  'freight_forwarding',
  '3pl',
  '4pl',
]);

export const shipmentStatusSchema = z.enum([
  'pending',
  'picked_up',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'exception',
  'cancelled',
]);

export const createLogisticsPartnerSchema = z.object({
  partnerId: z.string().uuid(),
  logisticsType: logisticsTypeSchema,
  serviceCapabilities: z.array(z.string()).default([]),
  fleetSize: z.number().int().positive().optional(),
  fleetTypes: z.array(z.string()).default([]),
  warehouseLocations: z.array(z.object({
    name: z.string(),
    address: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string(),
    capacity: z.number().optional(),
  })).default([]),
  coverageRegions: z.array(z.string()).default([]),
  trackingCapabilities: z.boolean().default(true),
  apiIntegration: z.boolean().default(false),
  trackingApiUrl: z.string().url().optional(),
  insuranceCoverage: z.number().positive().optional(),
  insuranceCertificateUrl: z.string().url().optional(),
});

export const shipmentItemSchema = z.object({
  itemId: z.string().uuid(),
  productCode: z.string(),
  productName: z.string(),
  quantity: z.number().positive(),
  weight: z.number().positive().optional(),
  volume: z.number().positive().optional(),
  description: z.string().optional(),
});

export const createShipmentSchema = z.object({
  tenantId: z.string().uuid(),
  logisticsId: z.string().uuid(),
  poId: z.string().uuid().optional(),
  shipmentType: z.enum(['outbound', 'inbound', 'transfer', 'return']),
  pickupDate: z.date(),
  pickupTime: z.string().optional(),
  pickupAddress: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string(),
    contactName: z.string().optional(),
    contactPhone: z.string().optional(),
  }),
  deliveryDate: z.date(),
  deliveryTime: z.string().optional(),
  deliveryAddress: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string(),
    contactName: z.string().optional(),
    contactPhone: z.string().optional(),
  }),
  items: z.array(shipmentItemSchema).min(1),
  totalWeight: z.number().positive().optional(),
  totalVolume: z.number().positive().optional(),
  packageCount: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

export const acceptShipmentSchema = z.object({
  accepted: z.boolean(),
  assignedDriver: z.string().optional(),
  vehicleNumber: z.string().optional(),
  estimatedPickupTime: z.date().optional(),
  rejectionReason: z.string().optional(),
});

export const updateShipmentStatusSchema = z.object({
  status: shipmentStatusSchema,
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string().optional(),
  }).optional(),
  description: z.string().optional(),
  estimatedDeliveryTime: z.date().optional(),
});

export const getShipmentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: shipmentStatusSchema.optional(),
  logisticsId: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  sortBy: z.enum(['pickupDate', 'deliveryDate', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type LogisticsType = z.infer<typeof logisticsTypeSchema>;
export type ShipmentStatus = z.infer<typeof shipmentStatusSchema>;
export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;
export type UpdateShipmentStatusInput = z.infer<typeof updateShipmentStatusSchema>;
export type GetShipmentsQuery = z.infer<typeof getShipmentsQuerySchema>;
export type AcceptShipmentSchema = z.infer<typeof acceptShipmentSchema>;

