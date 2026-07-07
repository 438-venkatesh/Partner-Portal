const PARTNER_TYPE_LABELS: Record<string, string> = {
  agency: 'Agency',
  reseller: 'Reseller',
  integrator: 'Integrator',
  consultant: 'Consultant',
  affiliate: 'Affiliate',
  supplier: 'Supplier',
  logistics_partner: 'Logistics',
  supplier_logistics: 'Supplier & logistics',
};

export function formatPartnerTypeLabel(partnerType: string | undefined | null): string {
  if (!partnerType) return 'Partner';
  return PARTNER_TYPE_LABELS[partnerType] ?? partnerType.replace(/_/g, ' ');
}
